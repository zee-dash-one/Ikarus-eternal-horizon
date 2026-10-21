import Dexie, { type Table } from 'dexie'
import type { RunSubmission } from '../../../shared/rankings.ts'

export interface ResultOutbox {
  put(run: RunSubmission): Promise<void>
  load(): Promise<RunSubmission | null>
  remove(runId: string): Promise<void>
  close?(): void
}
interface PendingRecord { userId: string; runId: string; schema: 1; payload: RunSubmission }
/** A pending transport message, not an authoritative ranking. Never shared across accounts. */
export class IndexedResultOutbox implements ResultOutbox {
  private readonly _db = new Dexie('ikarus-result-outbox')
  private readonly _table: Table<PendingRecord, string>
  constructor(private readonly _userId: string) {
    this._db.version(1).stores({ pending: 'userId,runId' })
    this._table = this._db.table('pending')
  }
  async put(run: RunSubmission): Promise<void> {
    await this._db.transaction('rw', this._table, async () => {
      const existing = await this._table.get(this._userId)
      if (existing && existing.runId !== run.runId) throw new Error('Há um resultado pendente nesta conta. Recupere-o antes de iniciar outra partida.')
      await this._table.put({ userId: this._userId, runId: run.runId, schema: 1, payload: structuredClone(run) })
    })
  }
  async load(): Promise<RunSubmission | null> {
    const row = await this._table.get(this._userId)
    if (!row) return null
    if (row.schema !== 1 || row.payload.runId !== row.runId || !row.payload.token || !['normal', 'survivor'].includes(row.payload.mode)) throw new Error('Resultado pendente incompatível. Preserve os dados deste navegador antes de tentar novamente.')
    return row.payload
  }
  async remove(runId: string): Promise<void> {
    await this._db.transaction('rw', this._table, async () => {
      if ((await this._table.get(this._userId))?.runId === runId) await this._table.delete(this._userId)
    })
  }
  close(): void { this._db.close() }
}
