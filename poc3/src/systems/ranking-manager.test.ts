import { describe, it, expect, vi } from 'vitest'
import { RankingManager } from './ranking-manager.ts'
import type { RankingPlatformAdapter, RankingPeriod } from '../../../shared/rankings.ts'

describe('RankingManager cache', () => {
  it('an older bests request cannot downgrade a newly accepted eternal score', async () => {
    let release!: (value: Record<RankingPeriod, number>) => void
    const adapter: RankingPlatformAdapter = {
      startRun: async () => { throw new Error('unused') },
      submitRun: async (run) => ({ runId: run.runId, score: run.score, endedAtUtc: '', eligible: true }),
      fetchBoard: async () => { throw new Error('unused') },
      fetchBests: vi.fn(() => new Promise<Record<RankingPeriod, number>>((resolve) => { release = resolve })),
    }
    const manager = new RankingManager(); manager.reset(adapter)
    const request = manager.refreshBests()
    await manager.submitRun({ runId: 'r1', mode: 'normal', seed: 's', buildVersion: 'b', contentVersion: 'c', score: 500, kills: 5, durationMs: 1000, endedAt: '', outcome: 'dead', debugModified: false, token: 't' })
    release({ weekly: 0, monthly: 0, annual: 0, eternal: 0 })
    await request
    expect(manager.highScore).toBe(500)
  })
})
