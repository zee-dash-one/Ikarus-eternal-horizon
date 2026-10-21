import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { migrate } from './migrations.ts'
import { RunRepository } from './run-repository.ts'

export interface PublicSession {
  readonly userId: string
  readonly displayName: string
  readonly provider: 'mock' | 'email' | 'google'
}
function hashToken(token: string): string { return createHash('sha256').update(token).digest('hex') }

/** Server-only data access; never called from the game frame loop. */
export class LocalRepository {
  private readonly db: DatabaseSync
  private closed = false
  readonly schemaVersion: number
  readonly runs: RunRepository

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    try { this.schemaVersion = migrate(this.db) } catch (error) { this.db.close(); throw error }
    this.runs = new RunRepository(this.db)
  }
  resolveExternal(subject: string, provider: 'email' | 'google', now: number): PublicSession {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      let row = this.db.prepare('SELECT u.id, u.display_name FROM external_identities i JOIN users u ON u.id = i.user_id WHERE i.subject = ?').get(subject)
      if (!row) {
        const id = randomUUID(), name = `Pilot ${id.slice(0, 8)}`
        // Namespace external identities. Never link a real identity to an unverified DEV email.
        this.db.prepare('INSERT INTO users(id, email_normalized, display_name, created_at) VALUES (?, ?, ?, ?)').run(id, `supabase:${subject}`, name, now)
        this.db.prepare('INSERT INTO external_identities(subject, user_id, provider) VALUES (?, ?, ?)').run(subject, id, provider)
        row = { id, display_name: name }
      }
      this.db.exec('COMMIT')
      return { userId: String(row.id), displayName: String(row.display_name), provider }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  signIn(email: string, now: number, ttlMs: number, previousToken?: string) {
    const token = randomBytes(32).toString('hex')
    const proposedId = randomUUID()
    this.db.exec('BEGIN IMMEDIATE')
    try {
      this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now)
      if (previousToken) this.revokeSession(previousToken)
      this.db.prepare('INSERT INTO users(id, email_normalized, display_name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email_normalized) DO NOTHING')
        .run(proposedId, email, `Pilot ${proposedId.slice(0, 8)}`, now)
      const user = this.db.prepare('SELECT id, display_name FROM users WHERE email_normalized = ?').get(email)
      if (!user) throw new Error('Failed to resolve local user')
      this.db.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), user.id, now + ttlMs)
      this.db.exec('COMMIT')
      return { token, session: { userId: String(user.id), displayName: String(user.display_name), provider: 'mock' } satisfies PublicSession }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  probeSession(token: string | undefined, now: number): PublicSession | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null
    const user = this.db.prepare('SELECT u.id, u.display_name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').get(hashToken(token), now)
    return user ? { userId: String(user.id), displayName: String(user.display_name), provider: 'mock' } : null
  }
  revokeSession(token: string): void { this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token)) }
  getSetting(userId: string, key: string): { schemaVersion: number; payload: unknown } | null {
    const row = this.db.prepare('SELECT schema_version, payload FROM profile_settings WHERE user_id = ? AND key = ?').get(userId, key)
    return row ? { schemaVersion: Number(row.schema_version), payload: JSON.parse(String(row.payload)) as unknown } : null
  }
  putSetting(userId: string, key: string, schemaVersion: number, payload: unknown, now: number): void {
    this.db.prepare(`INSERT INTO profile_settings(user_id, key, schema_version, payload, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET schema_version = excluded.schema_version, payload = excluded.payload, updated_at = excluded.updated_at`)
      .run(userId, key, schemaVersion, JSON.stringify(payload), now)
  }
  close(): void { if (!this.closed) { this.db.close(); this.closed = true } }
}
