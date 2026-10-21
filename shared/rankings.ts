export type GameMode = 'normal' | 'survivor'
export type RankingPeriod = 'weekly' | 'monthly' | 'annual' | 'eternal'
export const RANKING_PERIODS: readonly RankingPeriod[] = ['weekly', 'monthly', 'annual', 'eternal']

export interface RunMetadata {
  readonly runId: string
  readonly mode: GameMode
  readonly seed: string
  readonly buildVersion: string
  readonly contentVersion: string
}
export interface RunTicket extends RunMetadata { readonly token: string }
export interface RunSummary extends RunMetadata {
  readonly score: number
  readonly kills: number
  readonly durationMs: number
  readonly endedAt: string
  readonly outcome: 'dead'
  readonly debugModified: boolean
}
export interface RunSubmission extends RunSummary { readonly token: string }
export interface AcceptedRun {
  readonly runId: string
  readonly score: number
  readonly endedAtUtc: string
  readonly eligible: boolean
}
export interface RankRow {
  readonly runId: string
  readonly position: number
  readonly displayName: string
  readonly score: number
  readonly kills: number
  readonly durationMs: number
  readonly endedAtUtc: string
  readonly isCurrentUser: boolean
}
export interface RankingBoard {
  readonly mode: GameMode
  readonly period: RankingPeriod
  readonly startsAt: string | null
  readonly endsAt: string | null
  readonly serverTime: string
  readonly totalPlayers: number
  readonly rows: readonly RankRow[]
  readonly personalBest: RankRow | null
}
export interface RankingPlatformAdapter {
  startRun(mode?: GameMode): Promise<RunTicket>
  submitRun(run: RunSubmission): Promise<AcceptedRun>
  fetchBoard(mode: GameMode, period: RankingPeriod): Promise<RankingBoard>
  fetchBests(mode?: GameMode): Promise<Record<RankingPeriod, number>>
}
