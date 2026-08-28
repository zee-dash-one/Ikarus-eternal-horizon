import type { AuthPlatformAdapter, AuthSession } from './auth-types.ts'

export class DemoAuthAdapter implements AuthPlatformAdapter {
  private readonly _apiBase: string

  constructor(apiBase = '/api') {
    this._apiBase = apiBase.replace(/\/$/, '')
  }

  getGoogleStartUrl(): string {
    return `${this._apiBase}/auth/google/start`
  }

  async probeSession(): Promise<AuthSession | null> {
    try {
      const res = await fetch(`${this._apiBase}/me`, { credentials: 'include' }) // /api/me
      if (!res.ok) {
        return null
      }
      const data = (await res.json()) as AuthSession
      return data
    } catch {
      return null
    }
  }

  async trySignIn(username: string, password: string): Promise<AuthSession | null> {
    if (!username.trim() || !password.trim()) {
      return null
    }
    const session: AuthSession = {
      userId: `mock:${username.trim()}`,
      displayName: username.trim(),
      provider: 'mock',
    }
    return session
  }

  signInWithGoogle(): void {
    window.open(this.getGoogleStartUrl(), '_blank', 'noopener,noreferrer')
  }

  async signOut(): Promise<void> {
    await fetch(`${this._apiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  }
}
