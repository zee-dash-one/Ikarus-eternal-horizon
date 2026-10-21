import { BALANCE } from '../core/balancer.ts'
import type { RunScoreEvent } from '../core/run-score-event.ts'
import type { IntegrityState } from '../core/sheet/char-sheet.ts'
import type { RunMetadata, RunSummary } from '../../../shared/rankings.ts'

/** Pure simulation state. DEAD freezes one summary; I/O is handled after the tick. */
export class RunResultManager {
  private readonly _metadata: RunMetadata
  private readonly _seen = new Set<string>()
  private _entityCredits = false
  private readonly _authorized = new Set<string>()
  private _elapsedMs = 0
  private _score = 0
  private _kills = 0
  private _cancelled = false
  private _debugModified = false
  private _summary: RunSummary | null = null

  constructor(metadata: RunMetadata) {
    this._metadata = Object.freeze({ runId: metadata.runId, mode: metadata.mode, seed: metadata.seed, buildVersion: metadata.buildVersion, contentVersion: metadata.contentVersion })
  }
  get metadata(): RunMetadata { return this._metadata }
  get score(): number { return this._score }
  get kills(): number { return this._kills }
  get elapsedSec(): number { return this._elapsedMs / 1000 }
  get summary(): RunSummary | null { return this._summary }
  /** In prepared gameplay, credit only a currently emitted entity, once. Bounded by pools. */
  enableEntityCredits(): void { this._entityCredits = true; this._seen.clear(); this._authorized.clear() }
  authorizeEntity(id: string): void { if (this._entityCredits) this._authorized.add(id) }
  pruneEntityCredits(isAlive: (id: string) => boolean): void {
    for (const id of this._authorized) if (!isAlive(id)) this._authorized.delete(id)
  }
  get pendingCreditCount(): number { return this._authorized.size }
  advance(dt: number): void {
    if (!this._summary && !this._cancelled && Number.isFinite(dt) && dt > 0) this._elapsedMs += dt * 1000
  }
  applyEvent(event: RunScoreEvent): void {
    if (this._summary || this._cancelled || !event.creditedToPlayer) return
    if (this._entityCredits) { if (!this._authorized.delete(event.eventId)) return }
    else { if (this._seen.has(event.eventId)) return; this._seen.add(event.eventId) }
    if (event.type === 'enemy_destroyed') {
      this._kills++
      this._score += BALANCE.scoring[event.kind]
    } else this._score += BALANCE.scoring.meteors[event.size]
  }
  markDebugModified(): void { if (!this._summary) this._debugModified = true }
  cancel(): void { this._cancelled = true; this._authorized.clear(); this._seen.clear() }
  observeIntegrity(state: IntegrityState, endedAt: string): RunSummary | null {
    if (state !== 'DEAD' || this._summary || this._cancelled) return null
    this._summary = Object.freeze({ ...this._metadata, score: this._score, kills: this._kills, durationMs: Math.round(this._elapsedMs), endedAt, outcome: 'dead', debugModified: this._debugModified })
    return this._summary
  }
}
