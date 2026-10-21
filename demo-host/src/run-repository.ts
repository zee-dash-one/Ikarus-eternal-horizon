import type { DatabaseSync } from 'node:sqlite'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { utcWindow } from './ranking-periods.ts'
import type { AcceptedRun, GameMode, RankingBoard, RankingPeriod, RankRow, RunSubmission, RunTicket } from '../../shared/rankings.ts'

export class RankingError extends Error {
  readonly status: 400 | 403 | 409
  constructor(status: 400 | 403 | 409, message: string) { super(message); this.status = status }
}
function hash(value: string): string { return createHash('sha256').update(value).digest('hex') }

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

/** Server owns identity, ticket metadata, first accepted time and leaderboard windows. */
export class RunRepository {
  private readonly db: DatabaseSync
  constructor(db: DatabaseSync) { this.db = db }

  insert(run: RunRecord, submissionHash: string | null = null): void {
    this.db.prepare(`INSERT INTO runs(run_id, user_id, mode, score, kills, duration_ms, ended_at_utc, seed, build_version, content_version, eligible, submission_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      run.runId, run.userId, run.mode, run.score, run.kills, run.durationMs,
      run.endedAtUtc, run.seed, run.buildVersion, run.contentVersion, run.eligible ? 1 : 0, submissionHash,
    )
  }

  start(userId: string, buildVersion: string, contentVersion: string, now: number, mode: GameMode = 'normal'): RunTicket {
    const ticket: RunTicket = { runId: randomUUID(), mode, seed: randomBytes(16).toString('hex'), buildVersion, contentVersion, token: randomBytes(32).toString('hex') }
    this.db.prepare(`INSERT INTO run_tickets(run_id, user_id, token_hash, mode, seed, build_version, content_version, started_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ticket.runId, userId, hash(ticket.token), ticket.mode, ticket.seed, buildVersion, contentVersion, now, now + 86400000)
    return ticket
  }

  submit(userId: string, run: RunSubmission, now: number): AcceptedRun {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const ticket = this.db.prepare('SELECT * FROM run_tickets WHERE run_id = ?').get(run.runId)
      if (!ticket || ticket.user_id !== userId || ticket.token_hash !== hash(run.token)) throw new RankingError(403, 'invalid_ticket')
      if (ticket.mode !== run.mode || ticket.seed !== run.seed || ticket.build_version !== run.buildVersion || ticket.content_version !== run.contentVersion) throw new RankingError(400, 'ticket_metadata_mismatch')
      const fingerprint = hash(JSON.stringify([run.runId, run.mode, run.seed, run.buildVersion, run.contentVersion, run.score, run.kills, run.durationMs, run.endedAt, run.outcome, run.debugModified]))
      const existing = this.db.prepare('SELECT submission_hash FROM runs WHERE run_id = ?').get(run.runId)
      let stored: RunRecord
      if (existing) {
        if (existing.submission_hash !== fingerprint) throw new RankingError(409, 'conflicting_submission')
        const found = this.findForUser(run.runId, userId)
        if (!found) throw new RankingError(403, 'invalid_owner')
        stored = found
      } else {
        if (Number(ticket.expires_at) <= now) throw new RankingError(403, 'expired_ticket')
        if (run.durationMs > Math.max(0, now - Number(ticket.started_at)) + 30000) throw new RankingError(400, 'invalid_duration')
        stored = { ...run, userId, endedAtUtc: new Date(now).toISOString(), eligible: !run.debugModified && run.score > 0 }
        this.insert(stored, fingerprint)
      }
      this.db.exec('COMMIT')
      return { runId: stored.runId, score: stored.score, endedAtUtc: stored.endedAtUtc, eligible: stored.eligible }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }

  board(userId: string, mode: GameMode, period: RankingPeriod, now: number, limit = 50): RankingBoard {
    const range = utcWindow(period, now)
    const order = 'score DESC, kills DESC, duration_ms ASC, run_id ASC'
    const records = this.db.prepare(`WITH personal AS (
      SELECT r.*, u.display_name, ROW_NUMBER() OVER (PARTITION BY r.user_id ORDER BY ${order}) AS personal_position
      FROM runs r JOIN users u ON u.id = r.user_id
      WHERE mode = ? AND eligible = 1 AND score > 0 AND (? IS NULL OR ended_at_utc >= ?) AND (? IS NULL OR ended_at_utc < ?)
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY ${order}) AS position, COUNT(*) OVER () AS total_players FROM personal WHERE personal_position = 1
    ) SELECT * FROM ranked WHERE position <= ? OR user_id = ? ORDER BY position`).all(mode, range.startsAt, range.startsAt, range.endsAt, range.endsAt, limit, userId)
    const rows: RankRow[] = records.map((row) => ({ runId: String(row.run_id), position: Number(row.position), displayName: String(row.display_name), score: Number(row.score), kills: Number(row.kills), durationMs: Number(row.duration_ms), endedAtUtc: String(row.ended_at_utc), isCurrentUser: row.user_id === userId }))
    return { mode, period, ...range, serverTime: new Date(now).toISOString(), totalPlayers: Number(records[0]?.total_players ?? 0), rows: rows.filter((row) => row.position <= limit), personalBest: rows.find((row) => row.isCurrentUser) ?? null }
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
