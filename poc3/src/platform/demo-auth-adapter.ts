import type { AuthPlatformAdapter, AuthSession } from './auth-types.ts'
import { ApiError, apiRequest } from './api-client.ts'

export class DemoAuthAdapter implements AuthPlatformAdapter {
  private readonly _apiBase: string
  readonly capabilities: { readonly email: boolean; readonly google: boolean; readonly mock: boolean }

  constructor(apiBase = '/api', devEmail = false) {
    this._apiBase = apiBase.replace(/\/$/, '')
    this.capabilities = { email: devEmail, google: false, mock: devEmail }
  }
  private async _readSession(response: Response): Promise<AuthSession> {
    const data: unknown = await response.json()
    if (!data || typeof data !== 'object' || !('userId' in data) || typeof data.userId !== 'string' || !('displayName' in data) || typeof data.displayName !== 'string' || !('provider' in data) || !['mock', 'email', 'google', 'steam'].includes(String(data.provider))) throw new ApiError(500, 'Resposta de sessão inválida.')
    if (data.provider === 'mock' && !this.capabilities.mock) throw new ApiError(403, 'Sessões de desenvolvimento estão desabilitadas neste ambiente.')
    return data as AuthSession
  }
  async probeSession(): Promise<AuthSession | null> {
    const response = await apiRequest(`${this._apiBase}/me`) // GET /api/me
    if (response.status === 401) return null
    if (!response.ok) throw new ApiError(response.status)
    return this._readSession(response)
  }
  async signInWithEmail(email: string): Promise<AuthSession> {
    if (!this.capabilities.email) throw new Error('Login por email ainda não está configurado neste ambiente.')
    const response = await apiRequest(`${this._apiBase}/auth/dev-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    if (!response.ok) throw new ApiError(response.status)
    return this._readSession(response)
  }
  async signOut(): Promise<void> {
    const response = await apiRequest(`${this._apiBase}/auth/logout`, { method: 'POST' })
    if (!response.ok) throw new ApiError(response.status)
  }
}
