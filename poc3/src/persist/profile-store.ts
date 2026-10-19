import { ApiError, apiRequest } from '../platform/api-client.ts'

export type ProfileKey = 'controls' | 'audio' | 'graphics' | 'progress' | 'achievements' | 'dev-content'
export interface ProfileRecord { readonly schemaVersion: number; readonly payload: unknown }
export interface ProfileStore {
  load(key: ProfileKey): Promise<ProfileRecord | null>
  save(key: ProfileKey, record: ProfileRecord): Promise<void>
}

/** An instance belongs to one account. Header prevents stale writes after cookie/account changes. */
export class HttpProfileStore implements ProfileStore {
  private readonly _userId: string
  private readonly _apiBase: string
  constructor(userId: string, apiBase = '/api') {
    this._userId = userId
    this._apiBase = apiBase.replace(/\/$/, '')
  }
  async load(key: ProfileKey): Promise<ProfileRecord | null> {
    const response = await apiRequest(`${this._apiBase}/profile/settings/${key}`, { headers: { 'X-Ikarus-User': this._userId } })
    if (response.status === 404) return null
    if (response.status === 401) throw new ApiError(401, 'Sua sessão expirou. Entre novamente.')
    const row: unknown = await response.json()
    if (!row || typeof row !== 'object' || !('schemaVersion' in row) || !Number.isSafeInteger(row.schemaVersion) || !('payload' in row)) throw new ApiError(500, 'Preferências inválidas no serviço local.')
    return { schemaVersion: Number(row.schemaVersion), payload: row.payload }
  }
  async save(key: ProfileKey, record: ProfileRecord): Promise<void> {
    const response = await apiRequest(`${this._apiBase}/profile/settings/${key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Ikarus-User': this._userId }, body: JSON.stringify(record),
    })
    if (response.status === 401) throw new ApiError(401, 'Sua sessão expirou. Entre novamente.')
    if (!response.ok) throw new ApiError(response.status)
  }
}
