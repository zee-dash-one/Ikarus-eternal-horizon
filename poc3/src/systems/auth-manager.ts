import type { AuthCapabilities, AuthPlatformAdapter, AuthSession } from '../platform/auth-types.ts'

export class AuthManager {
  private _adapter: AuthPlatformAdapter | null = null
  private _session: AuthSession | null = null

  setPlatformAdapter(adapter: AuthPlatformAdapter): void {
    this._adapter = adapter
  }

  get session(): AuthSession | null {
    return this._session
  }

  get capabilities(): AuthCapabilities {
    return this._adapter?.capabilities ?? { email: false, google: false, mock: false }
  }

  async probeSession(): Promise<AuthSession | null> {
    if (!this._adapter) {
      return null
    }
    const session = await this._adapter.probeSession()
    this._session = session
    return session
  }

  /** No session means Login; errors propagate instead of manufacturing a guest. */
  async resolveBootSession(): Promise<AuthSession | null> {
    return this.probeSession()
  }

  async signInWithEmail(email: string): Promise<AuthSession> {
    if (!this._adapter?.capabilities.email) throw new Error('Login por email indisponível neste ambiente.')
    const normalized = email.trim().toLowerCase()
    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Informe um email válido.')
    const session = await this._adapter.signInWithEmail(normalized)
    this._session = session
    return session
  }

  signInWithGoogle(): void {
    if (!this._adapter?.capabilities.google || !this._adapter.startGoogleSignIn) throw new Error('Login Google indisponível neste ambiente.')
    this._adapter.startGoogleSignIn()
  }

  async signOut(): Promise<void> {
    await this._adapter?.signOut()
    this._session = null
  }

  setSession(session: AuthSession | null): void {
    this._session = session
  }
}
