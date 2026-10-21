import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.ts'
import { LocalRepository } from './repository.ts'
import { utcWindow } from './ranking-periods.ts'
import type { RunRecord } from './run-repository.ts'
import { DatabaseSync } from 'node:sqlite'
import { MIGRATIONS } from './migrations.ts'

const folders: string[] = []
const repos: LocalRepository[] = []
const origin = 'http://localhost:5173'
const config = { profile: 'dev', secureCookies: false, allowedOrigins: [origin], sessionTtlMs: 86400000 } as const
function setup() {
  const folder = mkdtempSync(join(tmpdir(), 'ikarus-rank-'))
  folders.push(folder)
  const path = join(folder, 'test.sqlite')
  const repository = new LocalRepository(path)
  repos.push(repository)
  let now = Date.parse('2026-10-19T12:00:00.000Z')
  const app = createApp({ repository, config, now: () => now })
  const user = repository.signIn('a@example.test', now, 86400000)
  const cookie = `ikarus_session=${user.token}`
  return { repository, path, app, user: user.session, cookie, advance: (ms: number) => { now += ms } }
}
function request(app: ReturnType<typeof createApp>, path: string, cookie: string, body?: unknown) {
  return app.request(`http://localhost/api/rankings${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
}
function record(userId: string, patch: Partial<RunRecord> = {}): RunRecord {
  return { runId: 'r1', userId, mode: 'normal', score: 100, kills: 2, durationMs: 1000, endedAtUtc: '2026-10-19T12:00:00.000Z', seed: 'seed', buildVersion: '1', contentVersion: '1', eligible: true, ...patch }
}
afterEach(() => {
  for (const repo of repos.splice(0)) repo.close()
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
})

test('UTC windows include leap days and Monday weeks crossing the civil year', () => {
  assert.deepEqual(utcWindow('weekly', Date.parse('2021-01-01T23:59:59.999Z')), { startsAt: '2020-12-28T00:00:00.000Z', endsAt: '2021-01-04T00:00:00.000Z' })
  assert.deepEqual(utcWindow('monthly', Date.parse('2024-02-29T12:00:00Z')), { startsAt: '2024-02-01T00:00:00.000Z', endsAt: '2024-03-01T00:00:00.000Z' })
  assert.deepEqual(utcWindow('annual', Date.parse('2024-12-31T23:59:59Z')), { startsAt: '2024-01-01T00:00:00.000Z', endsAt: '2025-01-01T00:00:00.000Z' })
  assert.deepEqual(utcWindow('eternal', 0), { startsAt: null, endsAt: null })
})

test('one best run per player, deterministic ties, periods/modes isolated, never exposes email', async () => {
  const t = setup()
  const b = t.repository.signIn('b@example.test', Date.parse('2026-10-19T12:00:00.000Z'), 86400000).session
  const c = t.repository.signIn('c@example.test', Date.parse('2026-10-19T12:00:00.000Z'), 86400000).session
  t.repository.runs.insert(record(t.user.userId))
  t.repository.runs.insert(record(t.user.userId, { runId: 'old-best', score: 999, endedAtUtc: '2025-12-31T23:59:59.999Z' }))
  t.repository.runs.insert(record(t.user.userId, { runId: 'survivor-best', mode: 'survivor', score: 5000 }))
  t.repository.runs.insert(record(t.user.userId, { runId: 'debug-best', score: 99999, eligible: false }))
  t.repository.runs.insert(record(b.userId, { runId: 'b', score: 100, kills: 3 }))
  t.repository.runs.insert(record(c.userId, { runId: 'c', score: 100, kills: 3, durationMs: 900 }))
  const weekly = await (await request(t.app, '/board?mode=normal&period=weekly', t.cookie)).json()
  assert.deepEqual(weekly.rows.map((row: { runId: string }) => row.runId), ['c', 'b', 'r1'])
  assert.equal(weekly.totalPlayers, 3)
  assert.equal(weekly.personalBest.position, 3)
  assert.equal(weekly.personalBest.isCurrentUser, true)
  assert.doesNotMatch(JSON.stringify(weekly), /example\.test|email/)
  const eternal = await (await request(t.app, '/board?mode=normal&period=eternal', t.cookie)).json()
  assert.equal(eternal.rows[0].runId, 'old-best')
  const survivor = await (await request(t.app, '/board?mode=survivor&period=eternal', t.cookie)).json()
  assert.equal(survivor.rows[0].runId, 'survivor-best')
  assert.equal(survivor.totalPlayers, 1)
})

test('period boundaries are half-open; scores survive restart and rollover without deletion', async () => {
  const t = setup()
  t.repository.runs.insert(record(t.user.userId, { endedAtUtc: '2026-10-19T00:00:00.000Z' }))
  const b = t.repository.signIn('b@example.test', 1000, 86400000).session
  t.repository.runs.insert(record(b.userId, { runId: 'before', endedAtUtc: '2026-10-18T23:59:59.999Z' }))
  t.repository.runs.insert(record(b.userId, { runId: 'next', score: 200, endedAtUtc: '2026-10-26T00:00:00.000Z' }))
  let board = await (await request(t.app, '/board?mode=normal&period=weekly', t.cookie)).json()
  assert.deepEqual(board.rows.map((row: { runId: string }) => row.runId), ['r1'])
  t.repository.close()
  const reopened = new LocalRepository(t.path)
  repos.push(reopened)
  const app = createApp({ repository: reopened, config, now: () => Date.parse('2026-10-19T12:00:00Z') })
  board = await (await request(app, '/board?mode=normal&period=eternal', t.cookie)).json()
  assert.equal(board.totalPlayers, 2)
})

test('server binds tickets to users and idempotent submissions preserve the first server timestamp', async () => {
  const t = setup()
  const ticket = await (await request(t.app, '/start', t.cookie, { mode: 'normal', buildVersion: 'test', contentVersion: '1' })).json()
  const payload = { ...ticket, score: 100, kills: 1, durationMs: 100, endedAt: '2000-01-01T00:00:00.000Z', outcome: 'dead', debugModified: false }
  t.advance(100)
  const first = await request(t.app, '/submit', t.cookie, payload)
  assert.equal(first.status, 200)
  const accepted = await first.json()
  assert.equal(accepted.endedAtUtc, '2026-10-19T12:00:00.100Z')
  t.advance(500)
  assert.deepEqual(await (await request(t.app, '/submit', t.cookie, payload)).json(), accepted)
  assert.equal((await request(t.app, '/submit', t.cookie, { ...payload, score: 900 })).status, 409)
  const b = t.repository.signIn('b@example.test', Date.parse('2026-10-19T12:00:00Z'), 86400000)
  assert.equal((await request(t.app, '/submit', `ikarus_session=${b.token}`, payload)).status, 403)
})

test('rejects forged/bad input, quits, invalid tickets and unknown modes; debug/zero scores are unranked', async () => {
  const t = setup()
  assert.equal((await request(t.app, '/start', '', {})).status, 401)
  assert.equal((await request(t.app, '/start', t.cookie, { mode: 'unknown', buildVersion: 'test', contentVersion: '1' })).status, 400)
  const ticket = await (await request(t.app, '/start', t.cookie, { mode: 'normal', buildVersion: 'test', contentVersion: '1' })).json()
  const payload = { ...ticket, score: 0, kills: 0, durationMs: 0, endedAt: '2026-10-19T12:00:00.000Z', outcome: 'dead', debugModified: true }
  for (const patch of [{ score: -1 }, { score: 1.5 }, { kills: '1' }, { score: null }, { outcome: 'quit' }, { token: 'fake' }, { userId: 'someone-else' }]) {
    const response = await request(t.app, '/submit', t.cookie, { ...payload, ...patch })
    assert.ok(response.status === 400 || response.status === 403)
  }
  assert.equal((await (await request(t.app, '/submit', t.cookie, payload)).json()).eligible, false)
  const board = await (await request(t.app, '/board?mode=normal&period=eternal', t.cookie)).json()
  assert.equal(board.rows.length, 0)
  assert.equal(board.personalBest, null)
  assert.equal((await request(t.app, '/board?mode=normal&period=invalid', t.cookie)).status, 400)
})

test('ties end at ascending runId and personal rank remains available outside displayed top rows', () => {
  const t = setup()
  const b = t.repository.signIn('b@example.test', 1000, 1000).session
  t.repository.runs.insert(record(t.user.userId, { runId: 'z-last' }))
  t.repository.runs.insert(record(b.userId, { runId: 'a-first' }))
  const board = t.repository.runs.board(t.user.userId, 'normal', 'weekly', Date.parse('2026-10-19T12:00:00Z'), 1)
  assert.equal(board.rows[0].runId, 'a-first')
  assert.equal(board.personalBest?.position, 2)
  assert.equal(board.totalPlayers, 2)
})

test('monthly/yearly upper boundaries exclude next period and include leap-day records', () => {
  const t = setup()
  const b = t.repository.signIn('b@example.test', 1000, 1000).session
  t.repository.runs.insert(record(t.user.userId, { runId: 'leap', endedAtUtc: '2024-02-29T23:59:59.999Z' }))
  t.repository.runs.insert(record(b.userId, { runId: 'march', endedAtUtc: '2024-03-01T00:00:00.000Z' }))
  t.repository.runs.insert(record(b.userId, { runId: 'next-year', endedAtUtc: '2025-01-01T00:00:00.000Z', score: 10000 }))
  const february = t.repository.runs.board(t.user.userId, 'normal', 'monthly', Date.parse('2024-02-15T00:00:00Z'))
  assert.deepEqual(february.rows.map((row) => row.runId), ['leap'])
  const year = t.repository.runs.board(t.user.userId, 'normal', 'annual', Date.parse('2024-12-31T00:00:00Z'))
  assert.equal(year.totalPlayers, 2)
  assert.ok(year.rows.every((row) => row.runId !== 'next-year'))
})

test('migration from part A preserves users and existing runs while adding tickets', () => {
  const folder = mkdtempSync(join(tmpdir(), 'ikarus-migration-'))
  folders.push(folder)
  const path = join(folder, 'old.sqlite')
  const db = new DatabaseSync(path)
  db.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL) STRICT')
  db.exec(MIGRATIONS[0])
  db.exec("INSERT INTO schema_migrations VALUES (1, 1000); INSERT INTO users VALUES ('old-user', 'old@example.test', 'Veteran', 1000)")
  db.prepare('INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('old-run', 'old-user', 'normal', 500, 5, 1000, '2026-10-19T00:00:00.000Z', 'old-seed', 'old-build', 'old-content', 1)
  db.close()
  const migrated = new LocalRepository(path)
  repos.push(migrated)
  assert.equal(migrated.schemaVersion, 2)
  assert.equal(migrated.runs.findForUser('old-run', 'old-user')?.score, 500)
  assert.equal(migrated.runs.start('old-user', 'test', '1', 1000).mode, 'normal')
})

test('positive debug and zero normal scores remain unranked, and expired unused tickets cannot finalize', async () => {
  const t = setup()
  for (const [score, debugModified] of [[500, true], [0, false]] as const) {
    const ticket = await (await request(t.app, '/start', t.cookie, { mode: 'normal', buildVersion: 'test', contentVersion: '1' })).json()
    const result = await (await request(t.app, '/submit', t.cookie, { ...ticket, score, kills: 0, durationMs: 0, endedAt: '2026-10-19T12:00:00.000Z', outcome: 'dead', debugModified })).json()
    assert.equal(result.eligible, false)
  }
  const ticket = await (await request(t.app, '/start', t.cookie, { mode: 'normal', buildVersion: 'test', contentVersion: '1' })).json()
  t.advance(86400001)
  const renewed = t.repository.signIn('a@example.test', Date.parse('2026-10-20T12:00:00.001Z'), 86400000)
  const cookie = `ikarus_session=${renewed.token}`
  assert.equal((await request(t.app, '/submit', cookie, { ...ticket, score: 100, kills: 1, durationMs: 0, endedAt: '2026-10-19T12:00:00.000Z', outcome: 'dead', debugModified: false })).status, 403)
  assert.equal((await (await request(t.app, '/board?mode=normal&period=eternal', cookie)).json()).rows.length, 0)
})
