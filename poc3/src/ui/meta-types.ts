import type { AcceptedRun, GameMode, RankingBoard, RankingPeriod, RunSummary } from '../../../shared/rankings.ts'
import type { PreparationProgress } from '../core/run-plan.ts'

export interface MetaState {
  readonly mode: GameMode
  readonly preparation: PreparationProgress | null
  readonly screen: 'none' | 'title' | 'result' | 'rankings'
  readonly titleBusy: boolean
  readonly titleError: string | null
  readonly summary: RunSummary | null
  readonly resultStatus: 'idle' | 'sending' | 'saved' | 'error'
  readonly resultError: string | null
  readonly accepted: AcceptedRun | null
  readonly period: RankingPeriod
  readonly board: RankingBoard | null
  readonly boardStatus: 'idle' | 'loading' | 'ready' | 'error'
  readonly boardError: string | null
}
export function createMetaState(): MetaState {
  return { mode: 'normal', screen: 'none', preparation: null, titleBusy: false, titleError: null, summary: null, resultStatus: 'idle', resultError: null, accepted: null, period: 'weekly', board: null, boardStatus: 'idle', boardError: null }
}
export interface MetaHandlers {
  onReauthenticate?(): void
  onMode?(mode: GameMode): void
  onPlay(): void
  onRankings(): void
  onTitle(): void
  onCloseRankings(): void
  onPeriod(period: RankingPeriod): void
  onRetryBoard(): void
  onRetrySubmit(): void
  onDiscardResult(): void
}
export interface MetaUiHost {
  setMetaState(patch: Partial<MetaState>): void
  setMetaHandlers(handlers: MetaHandlers): void
}
