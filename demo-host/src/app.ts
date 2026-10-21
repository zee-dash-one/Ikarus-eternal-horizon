import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { bodyLimit } from 'hono/body-limit'
import type { AppConfig } from './config.ts'
import type { LocalRepository, PublicSession } from './repository.ts'
import { RankingError } from './run-repository.ts'
import { validateStart, validateSubmission } from './ranking-validation.ts'
import { RANKING_PERIODS, type RankingPeriod } from '../../shared/rankings.ts'

import { AuthServiceUnavailable, createProductionAuth, type ProductionAuth } from './production-auth.ts'

const COOKIE = 'ikarus_session'
const SETTING_KEYS = new Set(['controls', 'audio', 'graphics', 'progress', 'achievements', 'dev-content'])
type Variables = { session: PublicSession }

export function createApp({ repository, config, now = Date.now, productionAuth }: { repository: LocalRepository; config: AppConfig; now?: () => number; productionAuth?: ProductionAuth }) {
  const auth = productionAuth ?? createProductionAuth(config, repository, now)
  const resolveSession = async (cookie: string | undefined, authorization: string | undefined): Promise<PublicSession | null> => {
    if (config.profile === 'dev') return repository.probeSession(cookie, now())
    if (!auth || !authorization?.startsWith('Bearer ') || authorization.length > 8192) return null
    return auth.resolve(authorization.slice(7))
  }
  const app = new Hono<{ Variables: Variables }>()
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    c.header('X-Content-Type-Options', 'nosniff')
    const requestOrigin = c.req.header('Origin')
    if (requestOrigin && config.allowedOrigins.includes(requestOrigin)) {
      c.header('Access-Control-Allow-Origin', requestOrigin)
      c.header('Vary', 'Origin')
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Ikarus-User')
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    }
    if (c.req.method === 'OPTIONS') return requestOrigin && config.allowedOrigins.includes(requestOrigin) ? c.body(null, 204) : c.json({ error: 'forbidden_origin' }, 403)
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('Origin')
      if (!origin || !config.allowedOrigins.includes(origin)) return c.json({ error: 'forbidden_origin' }, 403)
    }
    await next()
  })
  app.use('/api/*', bodyLimit({ maxSize: 80 * 1024, onError: (c) => c.json({ error: 'payload_too_large' }, 413) }))
  app.get('/api/health', (c) => c.json({ ok: true, profile: config.profile }))
  if (config.profile === 'dev') {
    app.post('/api/auth/dev-email', async (c) => {
      let body: unknown
      try { body = await c.req.json() } catch { return c.json({ error: 'invalid_json' }, 400) }
      const email = body && typeof body === 'object' && 'email' in body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'invalid_email' }, 400)
      const { token, session } = repository.signIn(email, now(), config.sessionTtlMs, getCookie(c, COOKIE))
      setCookie(c, COOKIE, token, { httpOnly: true, secure: config.secureCookies, sameSite: 'Lax', path: '/', maxAge: Math.floor(config.sessionTtlMs / 1000) })
      return c.json(session)
    })
  }
  app.get('/api/me', async (c) => {
    const session = await resolveSession(getCookie(c, COOKIE), c.req.header('Authorization'))
    return session ? c.json(session) : c.json({ error: 'unauthorized' }, 401)
  })
  app.post('/api/auth/logout', (c) => {
    const token = getCookie(c, COOKIE)
    if (token) repository.revokeSession(token)
    deleteCookie(c, COOKIE, { path: '/', secure: config.secureCookies })
    return c.json({ ok: true })
  })
  const requireSession: import('hono').MiddlewareHandler<{ Variables: Variables }> = async (c, next) => {
    const session = await resolveSession(getCookie(c, COOKIE), c.req.header('Authorization'))
    if (!session) return c.json({ error: 'unauthorized' }, 401)
    const expectedUser = c.req.header('X-Ikarus-User')
    if (expectedUser && expectedUser !== session.userId) return c.json({ error: 'account_changed' }, 409)
    c.set('session', session)
    await next()
  }
  app.use('/api/profile/*', requireSession)
  app.use('/api/rankings/*', requireSession)
  app.post('/api/rankings/start', async (c) => {
    const input = validateStart(await c.req.json().catch(() => null))
    return c.json(repository.runs.start(c.get('session').userId, input.buildVersion, input.contentVersion, now(), input.mode))
  })
  app.post('/api/rankings/submit', async (c) => {
    const input = validateSubmission(await c.req.json().catch(() => null))
    return c.json(repository.runs.submit(c.get('session').userId, input, now()))
  })
  app.get('/api/rankings/board', (c) => {
    const mode = c.req.query('mode')
    const period = c.req.query('period')
    if ((mode !== 'normal' && mode !== 'survivor') || !RANKING_PERIODS.includes(period as RankingPeriod)) return c.json({ error: 'invalid_board' }, 400)
    return c.json(repository.runs.board(c.get('session').userId, mode, period as RankingPeriod, now()))
  })
  app.get('/api/rankings/bests', (c) => {
    const time = now()
    const mode = c.req.query('mode') ?? 'normal'
    if (mode !== 'normal' && mode !== 'survivor') return c.json({ error: 'invalid_mode' }, 400)
    return c.json(Object.fromEntries(RANKING_PERIODS.map((period) => [period, repository.runs.board(c.get('session').userId, mode, period, time, 0).personalBest?.score ?? 0])))
  })
  app.get('/api/profile/settings/:key', (c) => {
    const key = c.req.param('key')
    if (!SETTING_KEYS.has(key)) return c.json({ error: 'unknown_setting' }, 400)
    const row = repository.getSetting(c.get('session').userId, key)
    return row ? c.json(row) : c.json({ error: 'not_found' }, 404)
  })
  app.put('/api/profile/settings/:key', async (c) => {
    const key = c.req.param('key')
    if (!SETTING_KEYS.has(key)) return c.json({ error: 'unknown_setting' }, 400)
    let body: unknown
    try { body = await c.req.json() } catch { return c.json({ error: 'invalid_json' }, 400) }
    if (!body || typeof body !== 'object' || !('schemaVersion' in body) || !Number.isSafeInteger(body.schemaVersion) || Number(body.schemaVersion) < 1 || Number(body.schemaVersion) > 1000 || !('payload' in body) || !body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload) || JSON.stringify(body.payload).length > 64 * 1024) {
      return c.json({ error: 'invalid_setting' }, 400)
    }
    repository.putSetting(c.get('session').userId, key, Number(body.schemaVersion), body.payload, now())
    return c.json({ ok: true })
  })
  app.onError((error, c) => {
    if (error instanceof AuthServiceUnavailable) return c.json({ error: 'auth_unavailable' }, 503)
    if (error instanceof RankingError) return c.json({ error: error.message }, error.status)
    console.error('DemoHost request failed:', error.message)
    return c.json({ error: 'service_error' }, 500)
  })
  return app
}
