import { describe, it, expect } from 'vitest'
import { RunResultManager } from './run-result-manager.ts'
import { BALANCE } from '../core/balancer.ts'
import { DamageManager } from './damage-manager.ts'
import { CharSheetManager } from './char-sheet-manager.ts'
import { createEventBus } from '../core/event.ts'

const metadata = { runId: 'test-run', mode: 'normal' as const, seed: 'seed', buildVersion: 'test', contentVersion: '1' }
describe('RunResultManager', () => {
  it('scores only credited destruction events, counts enemies, and deduplicates terminal events', () => {
    const run = new RunResultManager(metadata)
    run.advance(50)
    expect(run.score).toBe(0)
    const event = { type: 'enemy_destroyed', eventId: 'enemy-1', kind: 'enemy', creditedToPlayer: true } as const
    run.applyEvent(event); run.applyEvent(event)
    run.applyEvent({ type: 'meteor_destroyed', eventId: 'meteor-1', size: 'L', creditedToPlayer: true })
    run.applyEvent({ ...event, eventId: 'enemy-2', creditedToPlayer: false })
    expect(run.score).toBe(BALANCE.scoring.enemy + BALANCE.scoring.meteors.L)
    expect(run.kills).toBe(1)
  })
  it('DRIFTING is alive, DEAD finalizes once, no later events/ticks change the frozen summary', () => {
    const run = new RunResultManager(metadata)
    run.advance(1)
    expect(run.observeIntegrity('DRIFTING', '2026-10-19T00:00:00.000Z')).toBeNull()
    run.markDebugModified()
    const result = run.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')
    run.advance(10)
    expect(result?.durationMs).toBe(1000)
    expect(result?.debugModified).toBe(true)
    expect(run.observeIntegrity('DEAD', '2026-10-19T00:00:02.000Z')).toBeNull()
    expect(run.summary).toBe(result)
    expect(Object.isFrozen(result)).toBe(true)
  })
  it('cancelled/quit runs never produce a submission', () => {
    const run = new RunResultManager(metadata)
    run.cancel()
    expect(run.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')).toBeNull()
  })
  it('damage emits a credited enemy event only after DEAD, never at DRIFTING or on a repeated hit', () => {
    const events = createEventBus()
    const damage = new DamageManager(events)
    const enemy = CharSheetManager.create()
    const request = { target: enemy, rawDamage: 10000, scoreCredit: { eventId: 'enemy-life-1', kind: 'enemy' as const, creditedToPlayer: true } }
    damage.applyDamage(request)
    expect(events.drain()).toEqual([])
    damage.applyDamage(request)
    expect(events.drain()).toHaveLength(1)
    damage.applyDamage(request)
    expect(events.drain()).toEqual([])
  })
})
