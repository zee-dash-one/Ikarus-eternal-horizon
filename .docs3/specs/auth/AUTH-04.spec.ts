import { describe, it, expect, vi } from 'vitest'
import { DemoAuthAdapter } from '../../../poc3/src/platform/demo-auth-adapter.ts'
import { AuthManager } from '../../../poc3/src/systems/auth-manager.ts'

/** AUTH-04 — D47: providers are capability-gated; production OAuth is later work. */
describe('AUTH-04 — Google is unavailable in DEV', () => {
  it('email mock is explicit and Google cannot be invoked', () => {
    const adapter = new DemoAuthAdapter('/api', true)
    const auth = new AuthManager()
    auth.setPlatformAdapter(adapter)
    expect(adapter.capabilities).toEqual({ email: true, google: false, mock: true })
    expect(() => auth.signInWithGoogle()).toThrow(/indisponível/)
  })
  it('production default cannot perform mock sign-in', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    await expect(new DemoAuthAdapter().signInWithEmail('pilot@example.com')).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
    fetch.mockRestore()
  })
})