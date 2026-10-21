import { apiRequest, ApiError } from './api-client.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'
import type { AcceptedRun, GameMode, RankingBoard, RankingPeriod, RankingPlatformAdapter, RunSubmission, RunTicket } from '../../../shared/rankings.ts'

export class DemoRankingAdapter implements RankingPlatformAdapter {
  private readonly _userId: string
  constructor(userId: string) { this._userId = userId }
  private async _request<T>(path: string, body?: unknown): Promise<T> {
    const response = await apiRequest(`/api/rankings/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ikarus-User': this._userId },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (response.status === 401) throw new ApiError(401, 'Sua sessão expirou. Entre novamente para registrar o resultado.')
    if (!response.ok) throw new ApiError(response.status, 'Não foi possível acessar os recordes. Tente novamente.')
    return response.json() as Promise<T>
  }
  startRun(mode: GameMode = 'normal'): Promise<RunTicket> {
    return this._request('start', { mode, buildVersion: __BUILD_VERSION__, contentVersion: RUN_CONTENT_VERSION })
  }
  submitRun(run: RunSubmission): Promise<AcceptedRun> { return this._request('submit', run) }
  fetchBoard(mode: GameMode, period: RankingPeriod): Promise<RankingBoard> { return this._request(`board?mode=${mode}&period=${period}`) }
  fetchBests(mode: GameMode = 'normal'): Promise<Record<RankingPeriod, number>> { return this._request(`bests?mode=${mode}`) }
}
