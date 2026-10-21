import { afterEach, test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { LocalRepository } from './repository.ts'
import { createApp } from './app.ts'
import { createProductionAuth } from './production-auth.ts'
const repositories: LocalRepository[] = []
const origin = 'https://game.example.test'
const config = { profile: 'production', secureCookies: true, allowedOrigins: [origin], sessionTtlMs: 86400000, supabaseUrl: 'https://project.supabase.co', supabasePublishableKey: 'sb_publishable_configuration_example' } as const
afterEach(() => { mock.restoreAll(); for (const repo of repositories.splice(0)) repo.close() })
function repository() { const repo = new LocalRepository(':memory:'); repositories.push(repo); return repo }
test('production resolves verified provider identity, isolates DEV accounts and rejects unconfirmed email', async () => {
  const repo = repository(), dev = repo.signIn('same@example.test', 1000, 86400000)
  let confirmed = true
  mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    assert.match(String(url), /auth\/v1\/user/)
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer provider-token')
    return new Response(JSON.stringify({ id: 'verified-subject', email: 'same@example.test', email_confirmed_at: confirmed ? '2026-10-21T00:00:00Z' : null, app_metadata: { provider: 'email' }, user_metadata: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
  const auth = createProductionAuth(config, repo, () => 1000)
  const first = await auth?.resolve('provider-token'), second = await auth?.resolve('provider-token')
  assert.ok(first); assert.equal(first.userId, second?.userId); assert.notEqual(first.userId, dev.session.userId)
  confirmed = false
  assert.equal(await auth?.resolve('provider-token'), null)
})
test('production API accepts bearer sessions only, checks expected account, origins and keeps mock routes absent', async () => {
  const repo = repository(), identity = repo.resolveExternal('subject', 'google', 1000)
  const app = createApp({ repository: repo, config, productionAuth: { resolve: async (token) => token === 'valid' ? identity : null } })
  const request = (path: string, headers: Record<string, string> = {}) => app.request('https://api.example.test/api' + path, { headers })
  assert.equal((await request('/me', { Cookie: 'ikarus_session=anything' })).status, 401)
  assert.equal((await request('/me', { Authorization: 'Bearer forged' })).status, 401)
  assert.equal((await request('/me', { Authorization: 'Bearer valid' })).status, 200)
  assert.equal((await request('/rankings/board?mode=normal&period=eternal', { Authorization: 'Bearer valid', 'X-Ikarus-User': 'other' })).status, 409)
  const preflight = await app.request('https://api.example.test/api/rankings/start', { method: 'OPTIONS', headers: { Origin: origin } })
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin)
  const dev = await app.request('https://api.example.test/api/auth/dev-email', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{"email":"x@example.test"}' })
  assert.equal(dev.status, 404)
})
test('Survivor tickets submit only to their own mode and bests never leak across modes', async () => {
  const repo = repository(), signed = repo.signIn('pilot@example.test', 1000, 86400000)
  const normal = repo.runs.start(signed.session.userId, 'build', 'content', 1000)
  const survivor = repo.runs.start(signed.session.userId, 'build', 'content', 1000, 'survivor')
  const submit = (ticket: typeof normal, score: number) => repo.runs.submit(signed.session.userId, { ...ticket, score, kills: 1, durationMs: 1000, endedAt: '2026-10-21T00:00:00.000Z', outcome: 'dead', debugModified: false }, 2000)
  assert.throws(() => submit({ ...survivor, mode: 'normal' }, 500), /metadata/)
  submit(normal, 100); submit(survivor, 500)
  assert.equal(repo.runs.board(signed.session.userId, 'normal', 'eternal', 2000).personalBest?.score, 100)
  assert.equal(repo.runs.board(signed.session.userId, 'survivor', 'eternal', 2000).personalBest?.score, 500)
})
