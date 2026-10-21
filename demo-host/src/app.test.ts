import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app.ts'
import { LocalRepository } from './repository.ts'
import { readConfig } from './config.ts'
import { DatabaseSync } from 'node:sqlite'

const origin = 'http://localhost:5173'
const directories: string[] = []
const repositories: LocalRepository[] = []
function setup(options: { profile?: 'dev' | 'production'; now?: () => number; secureCookies?: boolean } = {}) {
  const folder = mkdtempSync(join(tmpdir(), 'ikarus-auth-'))
  directories.push(folder)
  const path = join(folder, 'test.sqlite')
  const repository = new LocalRepository(path)
  repositories.push(repository)
  const config = { profile: options.profile ?? 'dev', secureCookies: options.secureCookies ?? false, allowedOrigins: [origin], sessionTtlMs: 1000 } as const
  const app = createApp({ repository, config, now: options.now ?? (() => 1000) })
  return { app, repository, config, path }
}
function request(app: ReturnType<typeof createApp>, path: string, options: { method?: string; cookie?: string; body?: unknown; origin?: string | null } = {}) {
  const headers = new Headers()
  if (options.origin !== null) headers.set('Origin', options.origin ?? origin)
  if (options.cookie) headers.set('Cookie', options.cookie)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  return app.request(`http://localhost:8787/api${path}`, {
    method: options.method ?? 'GET', headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  })
}
async function login(app: ReturnType<typeof createApp>, email = 'pilot@example.com', cookie?: string) {
  const response = await request(app, '/auth/dev-email', { method: 'POST', cookie, body: { email } })
  assert.equal(response.status, 200)
  return { response, session: await response.json(), cookie: response.headers.get('Set-Cookie')!.split(';')[0] }
}
afterEach(() => {
  for (const repository of repositories.splice(0)) repository.close()
  for (const folder of directories.splice(0)) rmSync(folder, { recursive: true, force: true })
})

test('normalizes email, reuses identity, rotates opaque sessions and stores no password', async () => {
  const { app } = setup()
  const first = await login(app, '  PILOT@Example.com  ')
  const second = await login(app, 'pilot@example.com', first.cookie)
  assert.equal(first.session.userId, second.session.userId)
  assert.equal(first.session.provider, 'mock')
  assert.notEqual(first.cookie, second.cookie)
  assert.doesNotMatch(first.cookie, /pilot|example/)
  assert.match(first.response.headers.get('Set-Cookie')!, /HttpOnly/)
  assert.match(first.response.headers.get('Set-Cookie')!, /SameSite=Lax/)
  assert.doesNotMatch(first.response.headers.get('Set-Cookie')!, /Secure/)
  assert.equal((await request(app, '/me', { cookie: first.cookie })).status, 401)
  assert.equal((await request(app, '/me', { cookie: second.cookie })).status, 200)
})

test('rejects invalid emails, malformed JSON, missing/hostile origin and unauthenticated writes', async () => {
  const { app } = setup()
  for (const email of ['', 'pilot', 'a b@example.com', null, 3, 'x'.repeat(255) + '@test.com']) {
    assert.equal((await request(app, '/auth/dev-email', { method: 'POST', body: { email } })).status, 400)
  }
  const invalidJson = await app.request('/api/auth/dev-email', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{' })
  assert.equal(invalidJson.status, 400)
  for (const badOrigin of [null, 'https://evil.example']) {
    assert.equal((await request(app, '/auth/dev-email', { method: 'POST', origin: badOrigin, body: { email: 'a@test.com' } })).status, 403)
  }
  assert.equal((await request(app, '/profile/settings/controls', { method: 'PUT', body: { schemaVersion: 1, payload: {} } })).status, 401)
})

test('SQLite survives host recreation, expires sessions, revokes logout and scopes settings per user', async () => {
  let time = 1000
  const { app, repository, config, path } = setup({ now: () => time })
  const first = await login(app)
  const settings = { schemaVersion: 1, payload: { scheme: 'gamepad', bindings: {} } }
  assert.equal((await request(app, '/profile/settings/controls', { method: 'PUT', cookie: first.cookie, body: settings })).status, 200)
  repository.close()
  const reopened = new LocalRepository(path)
  repositories.push(reopened)
  const restarted = createApp({ repository: reopened, config, now: () => time })
  assert.equal((await request(restarted, '/me', { cookie: first.cookie })).status, 200)
  assert.deepEqual(await (await request(restarted, '/profile/settings/controls', { cookie: first.cookie })).json(), settings)
  const second = await login(restarted, 'other@example.com')
  assert.notEqual(second.session.userId, first.session.userId)
  assert.equal((await request(restarted, '/profile/settings/controls', { cookie: second.cookie })).status, 404)
  const staleWrite = await restarted.request('http://localhost:8787/api/profile/settings/controls', {
    method: 'PUT', headers: { Origin: origin, Cookie: second.cookie, 'Content-Type': 'application/json', 'X-Ikarus-User': first.session.userId }, body: JSON.stringify(settings),
  })
  assert.equal(staleWrite.status, 409)
  assert.equal((await request(restarted, '/auth/logout', { method: 'POST', cookie: first.cookie })).status, 200)
  assert.equal((await request(restarted, '/me', { cookie: first.cookie })).status, 401)
  assert.equal((await request(restarted, '/auth/logout', { method: 'POST', cookie: first.cookie })).status, 200)
  time = 2000
  assert.equal((await request(restarted, '/me', { cookie: second.cookie })).status, 401)
})

test('production never registers mock or fake Google routes and HTTPS sessions are Secure', async () => {
  const { app } = setup({ profile: 'production' })
  assert.equal((await request(app, '/auth/dev-email', { method: 'POST', body: { email: 'a@test.com' } })).status, 404)
  for (const route of ['/auth/google/start', '/auth/google/callback?code=dev']) assert.equal((await request(app, route)).status, 404)
  const secure = setup({ secureCookies: true })
  assert.match((await login(secure.app)).response.headers.get('Set-Cookie')!, /Secure/)
})

test('runtime configuration fails closed and binds to loopback', () => {
  assert.equal(readConfig({}, []).profile, 'production')
  assert.equal(readConfig({}, ['--dev', '--allow-local-http']).secureCookies, false)
  assert.equal(readConfig({}, ['--dev']).secureCookies, true)
  assert.throws(() => readConfig({ NODE_ENV: 'production' }, ['--dev', '--allow-local-http']), /Production requires/)
  assert.equal(readConfig({}, []).hostname, '127.0.0.1')
  assert.throws(() => readConfig({ PORT: 'invalid' }, []))
})

test('migrations are idempotent, runs have foreign keys and settings reject invalid versions', async () => {
  const { app, repository, path } = setup()
  const { cookie, session } = await login(app)
  for (const body of [{ schemaVersion: -1, payload: {} }, { schemaVersion: 1 }, { schemaVersion: 1, payload: 'x'.repeat(70000) }]) {
    assert.equal((await request(app, '/profile/settings/controls', { method: 'PUT', cookie, body })).status, 400)
  }
  assert.equal(repository.schemaVersion, 3)
  const run = { runId: 'test-run', userId: session.userId, mode: 'normal' as const, score: 100, kills: 2, durationMs: 1000, endedAtUtc: '2026-10-19T00:00:00.000Z', seed: 'test-seed', buildVersion: 'test', contentVersion: 'test', eligible: true }
  repository.runs.insert(run)
  assert.deepEqual(repository.runs.findForUser('test-run', session.userId), run)
  assert.equal(repository.runs.findForUser('test-run', 'other-user'), null)
  assert.throws(() => repository.runs.insert(run), /UNIQUE/)
  const inspection = new DatabaseSync(path)
  try {
    inspection.exec('PRAGMA foreign_keys = ON')
    assert.equal(inspection.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get()?.count, 3)
    assert.throws(() => inspection.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').run('hash', 'nonexistent-user', 1000), /FOREIGN KEY/)
    assert.equal(inspection.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'runs'").get()?.count, 1)
  } finally { inspection.close() }
})
