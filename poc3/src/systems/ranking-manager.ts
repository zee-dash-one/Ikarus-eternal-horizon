import { RANKING_PERIODS, type AcceptedRun, type GameMode, type RankingPeriod, type RankingPlatformAdapter, type RunSubmission } from '../../../shared/rankings.ts'

/** Per-account, in-memory bests. Render reads cache; only UI/scene gates perform I/O. */
export class RankingManager {
  private _adapter: RankingPlatformAdapter | null = null
  private _generation = 0
  private _mode: GameMode = 'normal'
  setMode(mode: GameMode): void {
    if (mode === this._mode) return
    this._mode = mode; this._generation++
    this._bests = { weekly: 0, monthly: 0, annual: 0, eternal: 0 }
  }
  private _bests: Record<RankingPeriod, number> = { weekly: 0, monthly: 0, annual: 0, eternal: 0 }
  get highScore(): number { return this._bests.eternal }
  reset(adapter: RankingPlatformAdapter | null): void {
    this._generation++
    this._adapter = adapter
    this._mode = 'normal'
    this._bests = { weekly: 0, monthly: 0, annual: 0, eternal: 0 }
  }
  private _requireAdapter(): RankingPlatformAdapter {
    if (!this._adapter) throw new Error('Serviço de recordes não configurado para esta conta.')
    return this._adapter
  }
  async refreshBests(): Promise<void> {
    const generation = this._generation
    const bests = await this._requireAdapter().fetchBests(this._mode)
    if (generation === this._generation) this._bests = { ...bests, eternal: Math.max(this._bests.eternal, bests.eternal) }
  }
  async startRun(mode: GameMode = this._mode) {
    const generation = this._generation
    const ticket = await this._requireAdapter().startRun(mode)
    if (generation !== this._generation) throw new Error('Conta alterada durante a preparação.')
    return ticket
  }
  async submitRun(run: RunSubmission): Promise<AcceptedRun> {
    const generation = this._generation
    const result = await this._requireAdapter().submitRun(run)
    if (generation === this._generation && result.eligible && run.mode === this._mode) {
      // Eternal is immediately safe; calendar caches are refreshed from the server.
      this._bests.eternal = Math.max(this._bests.eternal, result.score)
    }
    return result
  }
  async getBoard(mode: GameMode, period: RankingPeriod) {
    if (!RANKING_PERIODS.includes(period)) throw new Error('Período inválido.')
    return this._requireAdapter().fetchBoard(mode, period)
  }
}
