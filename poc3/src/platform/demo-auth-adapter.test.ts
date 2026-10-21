import { afterEach, describe, it, expect, vi } from 'vitest'
import { DemoAuthAdapter } from './demo-auth-adapter.ts'
import { HttpProfileStore } from '../persist/profile-store.ts'
import { loadControlSettings } from '../persist/control-settings.ts'

afterEach(() => vi.unstubAllGlobals())
const session = { userId: 'u1', displayName: 'Pilot', provider: 'mock' }
describe('HTTP auth and account persistence', () => {
  it('only treats 401 as missing session; network/500 never manufacture an identity', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 500 })).mockRejectedValueOnce(new Error('Offline'))
    vi.stubGlobal('fetch', fetch)
    const adapter = new DemoAuthAdapter('/api', true)
    expect(await adapter.probeSession()).toBeNull()
    await expect(adapter.probeSession()).rejects.toThrow()
    await expect(adapter.probeSession()).rejects.toThrow()
    expect(fetch.mock.calls[0][1].credentials).toBe('include')
  })
  it('signs in through the server, rejects production mock sessions and waits for logout', async () => {
    const fetch = vi.fn().mockImplementation(async () => Response.json(session))
    vi.stubGlobal('fetch', fetch)
    const adapter = new DemoAuthAdapter('/api', true)
    expect(await adapter.signInWithEmail('pilot@example.com')).toEqual(session)
    expect(fetch.mock.calls[0][0]).toBe('/api/auth/dev-email')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ email: 'pilot@example.com' })
    await expect(new DemoAuthAdapter().probeSession()).rejects.toThrow(/desabilitadas/)
    await adapter.signOut()
    expect(fetch.mock.lastCall?.[0]).toBe('/api/auth/logout')
  })
  it('distinguishes absent settings from failed/expired settings and binds writes to expected user', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 })).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const store = new HttpProfileStore('u1')
    expect((await loadControlSettings(store)).scheme).toBe('keyboard')
    await expect(loadControlSettings(store)).rejects.toThrow(/expirou/)
    await store.save('controls', { schemaVersion: 1, payload: { scheme: 'touch' } })
    expect(new Headers(fetch.mock.lastCall?.[1].headers).get('X-Ikarus-User')).toBe('u1')
  })
})
