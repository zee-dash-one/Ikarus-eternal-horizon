import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { bodyLimit } from 'hono/body-limit'
import type { AppConfig } from './config.ts'
import type { LocalRepository, PublicSession } from './repository.ts'

const COOKIE = 'ikarus_session'
const SETTING_KEYS = new Set(['controls', 'audio', 'graphics', 'progress', 'achievements', 'dev-content'])
type Variables = { session: PublicSession }

export function createApp({ repository, config, now = Date.now }: { repository: LocalRepository; config: AppConfig; now?: () => number }) {
  const app = new Hono<{ Variables: Variables }>()
  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
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
  app.get('/api/me', (c) => {
    const session = config.profile === 'dev' ? repository.probeSession(getCookie(c, COOKIE), now()) : null
    return session ? c.json(session) : c.json({ error: 'unauthorized' }, 401)
  })
  app.post('/api/auth/logout', (c) => {
    const token = getCookie(c, COOKIE)
    if (token) repository.revokeSession(token)
    deleteCookie(c, COOKIE, { path: '/', secure: config.secureCookies })
    return c.json({ ok: true })
  })
  app.use('/api/profile/*', async (c, next) => {
    const session = config.profile === 'dev' ? repository.probeSession(getCookie(c, COOKIE), now()) : null
    if (!session) return c.json({ error: 'unauthorized' }, 401)
    const expectedUser = c.req.header('X-Ikarus-User')
    if (expectedUser && expectedUser !== session.userId) return c.json({ error: 'account_changed' }, 409)
    c.set('session', session)
    await next()
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
    console.error('DemoHost request failed:', error.message)
    return c.json({ error: 'service_error' }, 500)
  })
  return app
}
