import { describe, it, expect } from 'vitest'
import { RunResultManager } from '../../../poc3/src/systems/run-result-manager.ts'

/** DOM focus/buttons: poc3/src/ui/meta-panels.test.ts. Disposal/retry: ui/run-meta-flow.test.ts. */
describe('SCENE-04-result — one terminal summary', () => {
  it('cannot create a result while drifting or a second result after DEAD', () => {
    const run = new RunResultManager({ runId: 'contract', mode: 'normal', seed: 'test', buildVersion: 'test', contentVersion: '1' })
    expect(run.observeIntegrity('DRIFTING', '2026-10-19T00:00:00.000Z')).toBeNull()
    const summary = run.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')
    expect(summary?.outcome).toBe('dead')
    expect(run.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')).toBeNull()
  })
})