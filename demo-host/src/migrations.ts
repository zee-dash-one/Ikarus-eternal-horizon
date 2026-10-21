import type { DatabaseSync } from 'node:sqlite'

/** Append migrations; never edit an already shipped schema version. */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE users (
     id TEXT PRIMARY KEY,
     email_normalized TEXT NOT NULL UNIQUE,
     display_name TEXT NOT NULL,
     created_at INTEGER NOT NULL
   ) STRICT;
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL
   ) STRICT;
   CREATE INDEX sessions_expiry ON sessions(expires_at);
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE profile_settings (
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     key TEXT NOT NULL,
     schema_version INTEGER NOT NULL CHECK(schema_version > 0),
     payload TEXT NOT NULL CHECK(json_valid(payload)),
     updated_at INTEGER NOT NULL,
     PRIMARY KEY(user_id, key)
   ) STRICT;
   CREATE TABLE runs (
     run_id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     mode TEXT NOT NULL CHECK(mode IN ('normal', 'survivor')),
     score INTEGER NOT NULL CHECK(score >= 0),
     kills INTEGER NOT NULL CHECK(kills >= 0),
     duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
     ended_at_utc TEXT NOT NULL,
     seed TEXT NOT NULL,
     build_version TEXT NOT NULL,
     content_version TEXT NOT NULL,
     eligible INTEGER NOT NULL CHECK(eligible IN (0, 1))
   ) STRICT;
   CREATE INDEX runs_boards ON runs(mode, eligible, ended_at_utc, score DESC);
   CREATE INDEX runs_user ON runs(user_id, mode, ended_at_utc);`,
  `ALTER TABLE runs ADD COLUMN submission_hash TEXT;
   CREATE TABLE run_tickets (
     run_id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token_hash TEXT NOT NULL,
     mode TEXT NOT NULL CHECK(mode IN ('normal', 'survivor')),
     seed TEXT NOT NULL,
     build_version TEXT NOT NULL,
     content_version TEXT NOT NULL,
     started_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL
   ) STRICT;
   CREATE INDEX run_tickets_user ON run_tickets(user_id);`,
  `CREATE TABLE external_identities (
     subject TEXT PRIMARY KEY,
     user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
     provider TEXT NOT NULL CHECK(provider IN ('email', 'google'))
   ) STRICT;`,
]

export function migrate(db: DatabaseSync): number {
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL) STRICT')
  const row = db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get()
  let version = Number(row?.version ?? 0)
  if (version > MIGRATIONS.length) throw new Error('Database schema is newer than this server')
  for (let i = version; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN IMMEDIATE')
    try {
      db.exec(MIGRATIONS[i])
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(i + 1, Date.now())
      db.exec('COMMIT')
      version = i + 1
    } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  return version
}
