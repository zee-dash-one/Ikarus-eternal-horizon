import { describe, it, expect } from 'vitest'
import { RankingManager } from '../../../poc3/src/systems/ranking-manager.ts'
import type { RankingPlatformAdapter } from '../../../shared/rankings.ts'

describe('RNK-05 — mode identity never falls back to Normal', () => {
  it('passes the explicit mode and period to the adapter', async () => {
    const adapter: RankingPlatformAdapter = {
      startRun: async () => { throw new Error('unused') }, submitRun: async () => { throw new Error('unused') }, fetchBests: async () => ({ weekly: 0, monthly: 0, annual: 0, eternal: 0 }),
      fetchBoard: async (mode, period) => ({ mode, period, startsAt: null, endsAt: null, serverTime: '', totalPlayers: 0, rows: [], personalBest: null }),
    }
    const manager = new RankingManager(); manager.reset(adapter)
    expect((await manager.getBoard('survivor', 'annual')).mode).toBe('survivor')
    expect((await manager.getBoard('normal', 'weekly')).mode).toBe('normal')
  })
})
