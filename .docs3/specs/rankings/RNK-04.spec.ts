import { describe, it, expect } from 'vitest'
import { RunMetaFlow } from '../../../poc3/src/ui/run-meta-flow.ts'
import { RankingManager } from '../../../poc3/src/systems/ranking-manager.ts'
import { GameUiController } from '../../../poc3/src/ui/game-ui-controller.ts'
import { RANKING_PERIODS } from '../../../shared/rankings.ts'

/** DOM acceptance: poc3/src/ui/meta-panels.test.ts; this card covers navigation of the four server boards. */
describe('RNK-04 — four boards from Title', () => {
  it('selects each UTC period and returns to Title', async () => {
    const rankings = new RankingManager()
    rankings.reset({ startRun: async () => { throw new Error('unused') }, submitRun: async () => { throw new Error('unused') }, fetchBests: async () => ({ weekly: 0, monthly: 0, annual: 0, eternal: 0 }), fetchBoard: async (mode, period) => ({ mode, period, startsAt: null, endsAt: null, serverTime: '', totalPlayers: 0, rows: [], personalBest: null }) })
    const ui = new GameUiController()
    const flow = new RunMetaFlow({ ui, rankings, onTitle: () => {}, onPlay: () => {}, onDisposeRun: () => {}, hasModifiedBalance: () => false })
    flow.showTitle(); await flow.openRankings()
    for (const period of RANKING_PERIODS) {
      await flow.loadBoard(period)
      expect(ui.meta.board?.period).toBe(period)
      expect(ui.meta.boardStatus).toBe('ready')
    }
    flow.closeRankings()
    expect(ui.meta.screen).toBe('title')
  })
})