import { describe, it, expect } from 'vitest'
import { AuthManager } from '../systems/auth-manager.ts'
import type { AuthPlatformAdapter, AuthSession } from '../platform/auth-types.ts'

class MockAdapter implements AuthPlatformAdapter {
  readonly capabilities = { email: true, google: false, mock: true }
  session: AuthSession | null = null
  async probeSession(): Promise<AuthSession | null> {
    return this.session
  }
  async signInWithEmail(email: string): Promise<AuthSession> {
    if (!email.includes('@')) throw new Error('Invalid email')
    this.session = { userId: 'u1', displayName: 'pilot', provider: 'mock' }
    return this.session
  }
  signInWithGoogle(): void {}
  async signOut(): Promise<void> {
    this.session = null
  }
}

describe('AuthManager', () => {
  it('email sign-in normalizes and resolves an adapter session', async () => {
    const auth = new AuthManager()
    const adapter = new MockAdapter()
    auth.setPlatformAdapter(adapter)
    const session = await auth.signInWithEmail('pilot@example.com')
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
