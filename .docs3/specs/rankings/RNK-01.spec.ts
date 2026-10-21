import { describe, it, expect } from 'vitest'
import { RankingManager } from '../../../poc3/src/systems/ranking-manager.ts'
import type { RankingPlatformAdapter } from '../../../shared/rankings.ts'

/** RNK-01 / D50: server is truth; cache must rehydrate and reset across accounts. SQLite restart is tested in demo-host. */
describe('RNK-01 — account bests', () => {
  it('rehydrates a new manager from the adapter and clears cache on logout', async () => {
    const adapter: RankingPlatformAdapter = {
      startRun: async () => { throw new Error('unused') }, submitRun: async () => { throw new Error('unused') }, fetchBoard: async () => { throw new Error('unused') },
      fetchBests: async () => ({ weekly: 20, monthly: 30, annual: 30, eternal: 50 }),
    }
    const first = new RankingManager(); first.reset(adapter); await first.refreshBests()
    const reload = new RankingManager(); reload.reset(adapter); await reload.refreshBests()
    expect(reload.highScore).toBe(first.highScore)
    reload.reset(null)
    expect(reload.highScore).toBe(0)
  })
})
