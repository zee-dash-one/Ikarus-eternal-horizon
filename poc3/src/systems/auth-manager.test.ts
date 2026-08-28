import { describe, it, expect } from 'vitest'
import { AuthManager } from '../systems/auth-manager.ts'
import type { AuthPlatformAdapter, AuthSession } from '../platform/auth-types.ts'

class MockAdapter implements AuthPlatformAdapter {
  session: AuthSession | null = null
  async probeSession(): Promise<AuthSession | null> {
    return this.session
  }
  async trySignIn(username: string, password: string): Promise<AuthSession | null> {
    if (!username.trim() || !password.trim()) return null
    this.session = { userId: 'u1', displayName: username, provider: 'mock' }
    return this.session
  }
  signInWithGoogle(): void {}
  async signOut(): Promise<void> {
    this.session = null
  }
}

describe('AuthManager', () => {
  it('mock sign-in succeeds when fields non-empty', async () => {
    const auth = new AuthManager()
    const adapter = new MockAdapter()
    auth.setPlatformAdapter(adapter)
    const session = await auth.trySignIn('pilot', 'secret')
    expect(session).not.toBeNull()
    expect(session?.displayName).toBe('pilot')
  })

  it('probeSession restores session', async () => {
    const auth = new AuthManager()
    const adapter = new MockAdapter()
    adapter.session = { userId: 'u2', displayName: 'Ace', provider: 'google' }
    auth.setPlatformAdapter(adapter)
    const session = await auth.probeSession()
    expect(session?.userId).toBe('u2')
  })
})
