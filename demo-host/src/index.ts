import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

const sessions = new Map<string, { userId: string; displayName: string }>()

app.get('/api/auth/google/start', (c) => {
  return c.redirect('/api/auth/google/callback?code=dev')
})

app.get('/api/auth/google/callback', (c) => {
  const sid = `sess_${Date.now()}`
  sessions.set(sid, { userId: 'google:user', displayName: 'Google Pilot' })
  c.header(
    'Set-Cookie',
    `ikarus_session=${sid}; HttpOnly; Secure; SameSite=Lax; Path=/`,
  )
  return c.redirect('/')
})

app.get('/api/me', (c) => {
  const cookie = c.req.header('cookie') ?? ''
  const match = cookie.match(/ikarus_session=([^;]+)/)
  if (!match) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  const sess = sessions.get(match[1] ?? '')
  if (!sess) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return c.json({
    userId: sess.userId,
    displayName: sess.displayName,
    provider: 'google',
  })
})

app.post('/api/auth/logout', (c) => {
  c.header('Set-Cookie', 'ikarus_session=; Max-Age=0; Path=/')
  return c.json({ ok: true })
})

const port = Number(process.env.PORT ?? 8787)
console.log(`DemoHost listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
