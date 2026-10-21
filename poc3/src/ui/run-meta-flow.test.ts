import { describe, it, expect, vi } from 'vitest'
import { GameUiController } from './game-ui-controller.ts'
import { RunMetaFlow } from './run-meta-flow.ts'
import { RankingManager } from '../systems/ranking-manager.ts'
import type { RunResultManager } from '../systems/run-result-manager.ts'
import type { RankingPlatformAdapter, RunSubmission } from '../../../shared/rankings.ts'

function setup() {
  const ticket = { runId: 'run1', mode: 'normal' as const, seed: 'seed', buildVersion: 'test', contentVersion: '1', token: 'secret' }
  const submit = vi.fn(async (run: RunSubmission) => ({ runId: run.runId, score: run.score, endedAtUtc: '2026-10-19T00:00:00.000Z', eligible: !run.debugModified && run.score > 0 }))
  const adapter: RankingPlatformAdapter = {
    startRun: vi.fn(async () => ticket), submitRun: submit,
    fetchBests: vi.fn(async () => ({ weekly: 10, monthly: 10, annual: 10, eternal: 10 })),
    fetchBoard: vi.fn(async (mode, period) => ({ mode, period, startsAt: null, endsAt: null, serverTime: '2026-10-19T00:00:00.000Z', totalPlayers: 0, rows: [], personalBest: null })),
  }
  const rankings = new RankingManager()
  rankings.reset(adapter)
  const ui = new GameUiController()
  let active: RunResultManager | null = null
  const onDisposeRun = vi.fn()
  const flow = new RunMetaFlow({ ui, rankings, onTitle: vi.fn(), onPlay: (run) => { active = run.results }, onDisposeRun, hasModifiedBalance: () => false })
  flow.showTitle()
  function end() {
    if (!active) throw new Error('No active run')
    active.advance(1)
    active.applyEvent({ type: 'enemy_destroyed', eventId: 'enemy', kind: 'enemy', creditedToPlayer: true })
    const summary = active.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')
    if (!summary) throw new Error('No summary')
    flow.finish(summary)
    return summary
  }
  return { flow, rankings, ui, adapter, submit, end, onDisposeRun }
}
describe('Result / rankings lifecycle', () => {
  it('freezes once, retries the exact payload, blocks navigation until acknowledged and clears private token from UI', async () => {
    const t = setup()
    t.submit.mockRejectedValueOnce(new Error('Network down'))
    await t.flow.play()
    t.flow.mountReady()
    t.onDisposeRun.mockClear()
    const summary = t.end()
    t.flow.finish(summary)
    expect(t.onDisposeRun).toHaveBeenCalledOnce()
    await t.flow.retrySubmit()
    expect(t.ui.meta.resultStatus).toBe('error')
    t.flow.showTitle()
    expect(t.ui.meta.screen).toBe('result')
    await t.flow.retrySubmit()
    expect(t.submit).toHaveBeenCalledTimes(2)
    expect(t.submit.mock.calls[0][0]).toBe(t.submit.mock.calls[1][0])
    expect(t.ui.meta.resultStatus).toBe('saved')
    expect(JSON.stringify(t.ui.meta)).not.toContain('secret')
    expect(t.rankings.highScore).toBe(100)
    await t.flow.openRankings()
    expect(t.ui.meta.boardStatus).toBe('ready')
    t.flow.closeRankings()
    expect(t.ui.meta.screen).toBe('result')
  })
  it('old account results/bests and stale board requests cannot overwrite the new screen', async () => {
    const t = setup()
    let resolve!: (value: Awaited<ReturnType<RankingPlatformAdapter['fetchBoard']>>) => void
    vi.mocked(t.adapter.fetchBoard).mockReturnValueOnce(new Promise((done) => { resolve = done }))
    t.flow.showTitle()
    const load = t.flow.openRankings()
    t.flow.clear()
    resolve({ mode: 'normal', period: 'weekly', serverTime: '', startsAt: null, endsAt: null, totalPlayers: 0, rows: [], personalBest: null })
    await load
    expect(t.ui.meta.screen).toBe('none')
    expect(t.rankings.highScore).toBe(0)
  })
  it('quit cancels the run without submitting', async () => {
    const t = setup()
    await t.flow.play()
    t.flow.mountReady()
    t.flow.showTitle()
    expect(t.submit).not.toHaveBeenCalled()
    expect(t.ui.meta.screen).toBe('title')
  })
  it('a late period response cannot overwrite the selected period', async () => {
    const t = setup()
    let release!: (value: Awaited<ReturnType<RankingPlatformAdapter['fetchBoard']>>) => void
    vi.mocked(t.adapter.fetchBoard).mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    const weekly = t.flow.openRankings()
    await t.flow.loadBoard('monthly')
    release({ mode: 'normal', period: 'weekly', startsAt: null, endsAt: null, serverTime: '', totalPlayers: 0, rows: [], personalBest: null })
    await weekly
    expect(t.ui.meta.period).toBe('monthly')
    expect(t.ui.meta.board?.period).toBe('monthly')
  })
  it('failed run preparation leaves an actionable menu and permits retry', async () => {
    const t = setup()
    vi.mocked(t.adapter.startRun).mockRejectedValueOnce(new Error('Service unavailable'))
    await t.flow.play()
    expect(t.ui.meta.screen).toBe('title')
    expect(t.ui.meta.titleBusy).toBe(false)
    expect(t.ui.meta.titleError).toContain('Service unavailable')
    await t.flow.play()
    t.flow.mountReady()
    expect(t.ui.meta.screen).toBe('none')
    expect(t.adapter.startRun).toHaveBeenCalledTimes(2)
  })
  it('keeps READY on the menu until a frame adopts it and ignores repeated Play', async () => {
    const t = setup()
    const first = t.flow.play()
    await t.flow.play()
    await first
    expect(t.adapter.startRun).toHaveBeenCalledOnce()
    expect(t.flow.lifecycle.phase).toBe('READY')
    expect(t.ui.meta.screen).toBe('title')
    expect(t.ui.meta.titleBusy).toBe(true)
    t.flow.mountReady(); t.flow.mountReady()
    expect(t.flow.lifecycle.phase).toBe('ACTIVE')
    expect(t.ui.meta.screen).toBe('none')
  })
  it('cancel during the ticket request cannot mount a late run or hide the menu', async () => {
    const t = setup()
    let release!: (ticket: Awaited<ReturnType<RankingPlatformAdapter['startRun']>>) => void
    vi.mocked(t.adapter.startRun).mockReturnValueOnce(new Promise((resolve) => { release = resolve }))
    const pending = t.flow.play()
    t.flow.showTitle()
    expect(t.flow.lifecycle.phase).toBe('CANCELLED')
    release({ runId: 'late', mode: 'normal', seed: 'late', token: 'late', buildVersion: 'test', contentVersion: '1' })
    await pending
    t.flow.mountReady()
    expect(t.flow.lifecycle.context).toBeNull()
    expect(t.ui.meta.screen).toBe('title')
    expect(t.ui.meta.titleBusy).toBe(false)
    await t.flow.play(); t.flow.mountReady()
    expect(t.flow.lifecycle.phase).toBe('ACTIVE')
  })
})
