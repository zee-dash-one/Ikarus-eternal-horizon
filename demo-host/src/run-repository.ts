import type { DatabaseSync } from 'node:sqlite'

export interface RunRecord {
  readonly runId: string
  readonly userId: string
  readonly mode: 'normal' | 'survivor'
  readonly score: number
  readonly kills: number
  readonly durationMs: number
  readonly endedAtUtc: string
  readonly seed: string
  readonly buildVersion: string
  readonly contentVersion: string
  readonly eligible: boolean
}

/** Persistence foundation only; result validation and ranking routes belong to part B. */
export class RunRepository {
  private readonly db: DatabaseSync
  constructor(db: DatabaseSync) { this.db = db }

  insert(run: RunRecord): void {
    this.db.prepare(`INSERT INTO runs(run_id, user_id, mode, score, kills, duration_ms, ended_at_utc, seed, build_version, content_version, eligible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      run.runId, run.userId, run.mode, run.score, run.kills, run.durationMs,
      run.endedAtUtc, run.seed, run.buildVersion, run.contentVersion, run.eligible ? 1 : 0,
    )
  }

  findForUser(runId: string, userId: string): RunRecord | null {
    const row = this.db.prepare('SELECT * FROM runs WHERE run_id = ? AND user_id = ?').get(runId, userId)
    return row ? {
      runId: String(row.run_id), userId: String(row.user_id), mode: row.mode as RunRecord['mode'],
      score: Number(row.score), kills: Number(row.kills), durationMs: Number(row.duration_ms),
      endedAtUtc: String(row.ended_at_utc), seed: String(row.seed), buildVersion: String(row.build_version),
      contentVersion: String(row.content_version), eligible: row.eligible === 1,
    } : null
  }
}
