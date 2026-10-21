import { expect, it, vi } from 'vitest'
import { RunMetaFlow } from './run-meta-flow.ts'
import { GameUiController } from './game-ui-controller.ts'
import { RankingManager } from '../systems/ranking-manager.ts'
import type { RankingPlatformAdapter, RunSubmission } from '../../../shared/rankings.ts'
import type { ResultOutbox } from '../persist/result-outbox.ts'

function fixture() {
  let saved: RunSubmission | null = null
  const outbox: ResultOutbox = { put: vi.fn(async (run) => { saved = structuredClone(run) }), load: vi.fn(async () => saved), remove: vi.fn(async () => { saved = null }) }
  const ui = new GameUiController(), rankings = new RankingManager()
  const submitRun = vi.fn(async (run: RunSubmission) => ({ runId: run.runId, score: run.score, endedAtUtc: run.endedAt, eligible: true }))
  rankings.reset({ fetchBoard: async () => { throw new Error('unused board') }, submitRun, fetchBests: async () => ({ weekly: 0, monthly: 0, annual: 0, eternal: 0 }), startRun: async () => ({ runId: 'r', token: 'ticket-secret', mode: 'normal', seed: 's', buildVersion: 't', contentVersion: 't' }) } as RankingPlatformAdapter)
  const flow = () => new RunMetaFlow({ ui, rankings, onPlay() {}, onTitle() {}, onDisposeRun() {}, hasModifiedBalance: () => false })
  return { ui, rankings, submitRun, outbox, flow, saved: () => saved }
}
it('persists before upload, restores exact payload after reload and excludes token from UI', async () => {
  const t = fixture(), first = t.flow(); first.bindOutbox(t.outbox); first.showTitle(); await first.play(); first.mountReady()
  const ctx = first.lifecycle.context
  if (!ctx) throw new Error('missing context')
  ctx.results.applyEvent({ type: 'enemy_destroyed', eventId: 'e', kind: 'enemy', creditedToPlayer: true })
  const summary = ctx.results.observeIntegrity('DEAD', '2026-10-21T12:00:00.000Z')
  if (!summary) throw new Error('missing result')
  t.submitRun.mockRejectedValueOnce(new Error('offline'))
  first.finish(summary); await first.retrySubmit()
  const payload = t.saved()
  expect(payload?.token).toBe('ticket-secret')
  expect(first.canLeaveResult).toBe(false)
  const reloaded = t.flow(); reloaded.bindOutbox(t.outbox)
  expect(await reloaded.restorePending()).toBe(true)
  expect(JSON.stringify(t.ui.meta)).not.toContain('ticket-secret')
  await reloaded.retrySubmit()
  expect(t.submitRun.mock.lastCall?.[0]).toEqual(payload)
  expect(t.saved()).toBeNull()
  expect(reloaded.canLeaveResult).toBe(true)
})
it('does not upload when the durable outbox fails and preserves the result in memory', async () => {
  const t = fixture(), flow = t.flow(); flow.bindOutbox(t.outbox)
  flow.showTitle(); await flow.play(); flow.mountReady()
  const ctx = flow.lifecycle.context
  if (!ctx) throw new Error('missing context')
  const summary = ctx.results.observeIntegrity('DEAD', '2026-10-21T12:00:00.000Z')
  if (!summary) throw new Error('missing summary')
  vi.mocked(t.outbox.put).mockRejectedValue(new Error('storage blocked'))
  flow.finish(summary); await flow.retrySubmit()
  expect(t.submitRun).not.toHaveBeenCalled()
  expect(t.ui.meta.resultError).toBe('storage blocked')
  expect(flow.canLeaveResult).toBe(false)
})
