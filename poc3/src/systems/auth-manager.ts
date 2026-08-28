import type { AuthPlatformAdapter, AuthSession } from '../platform/auth-types.ts'
import { BALANCE } from '../core/balancer.ts'

export class AuthManager {
  private _adapter: AuthPlatformAdapter | null = null
  private _session: AuthSession | null = null

  setPlatformAdapter(adapter: AuthPlatformAdapter): void {
    this._adapter = adapter
  }

  get session(): AuthSession | null {
    return this._session
  }

  async probeSession(): Promise<AuthSession | null> {
    if (!this._adapter) {
      return null
    }
    const session = await this._adapter.probeSession()
    this._session = session
    return session
  }

  /** Boot path: probe adapter, else optional guest stub (`BALANCE.auth.guestStub`). */
  async resolveBootSession(): Promise<AuthSession | null> {
    const session = await this.probeSession()
    if (session) {
      return session
    }
    const stub = BALANCE.auth.guestStub
    if (!stub.enabled) {
      return null
    }
    const guest: AuthSession = {
      userId: stub.userId,
      displayName: stub.displayName,
      provider: 'mock',
    }
    this._session = guest
    return guest
  }

  async trySignIn(username: string, password: string): Promise<AuthSession | null> {
    if (!this._adapter) {
      return null
    }
    const session = await this._adapter.trySignIn(username, password)
    if (session) {
      this._session = session
    }
    return session
  }

  signInWithGoogle(): void {
    this._adapter?.signInWithGoogle()
  }

  async signOut(): Promise<void> {
    await this._adapter?.signOut()
    this._session = null
  }

  setSession(session: AuthSession | null): void {
    this._session = session
  }
}
