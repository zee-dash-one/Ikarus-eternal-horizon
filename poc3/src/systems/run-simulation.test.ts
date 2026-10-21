import { describe, it, expect, vi } from 'vitest'
import { RunContext } from './run-context.ts'
import { RunResultManager } from './run-result-manager.ts'
import { SIM_DT, GameLoop } from '../core/game-loop.ts'
import { EMPTY_RUN_INPUT } from '../core/run-input.ts'
import type { RunInputFrame } from '../core/run-input.ts'
import { playfieldToWorld, worldToPlayfield } from '../core/playfield.ts'

function context(id = 'one') {
  return new RunContext(new RunResultManager({ runId: id, mode: 'normal', seed: `seed-${id}`, buildVersion: 'test', contentVersion: '1' }))
}
const moveFire: RunInputFrame = { moveX: 1, moveZ: -1, held: ['A'], pressed: [] }
describe('RunSimulation / per-attempt ownership', () => {
  it('runs in Node without input adapters or WebGL and publishes detached immutable snapshots', () => {
    const ctx = context()
    const initial = ctx.simulation.snapshot
    ctx.simulation.step(moveFire)
    const snapshot = ctx.simulation.snapshot
    expect(snapshot.tick).toBe(1)
    expect(snapshot.elapsedSec).toBeCloseTo(SIM_DT)
    expect(snapshot.player.x).toBeGreaterThan(0)
    expect(snapshot.player.z).toBeLessThan(0)
    expect(snapshot.shots?.length).toBe(1)
    expect(snapshot.score).toBe(0)
    expect(Object.isFrozen(snapshot.player)).toBe(true)
    expect(Object.isFrozen(snapshot.shots?.[0])).toBe(true)
    const oldShotX = snapshot.shots?.[0]?.x
    ctx.simulation.step(moveFire)
    expect(snapshot.tick).toBe(1)
    expect(snapshot.shots?.[0]?.x).toBe(oldShotX)
    expect(initial.player.x).toBe(0)
    ctx.dispose()
  })
  it('gates clocks, energy, projectiles, player and score during pause', () => {
    const ctx = context()
    const loop = new GameLoop({ step: () => ctx.simulation.step(moveFire) })
    loop.stepSim()
    const before = ctx.simulation.snapshot
    ctx.events.publish({ type: 'enemy_destroyed', eventId: 'pending', kind: 'enemy', creditedToPlayer: true })
    loop.pause()
    for (let i = 0; i < 100; i++) loop.stepSim()
    expect(ctx.simulation.snapshot).toBe(before)
    loop.resume(); loop.stepSim()
    expect(ctx.simulation.snapshot.score).toBe(100)
    expect(ctx.simulation.snapshot.tick).toBe(2)
    ctx.dispose()
  })
  it('keeps DRIFTING active, stops at DEAD and finalizes outside the tick', () => {
    const ctx = context()
    ctx.sheet.applyIntegrityDamage(ctx.sheet.summary.integrity_max)
    ctx.simulation.step()
    expect(ctx.simulation.snapshot.summary.integrityState).toBe('DRIFTING')
    expect(ctx.simulation.dead).toBe(false)
    ctx.sheet.applyIntegrityDamage(1)
    ctx.simulation.step()
    const terminal = ctx.simulation.snapshot
    expect(ctx.simulation.dead).toBe(true)
    expect(ctx.results.summary).toBeNull()
    ctx.simulation.step(moveFire)
    expect(ctx.simulation.snapshot).toBe(terminal)
    expect(ctx.results.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')?.durationMs).toBe(Math.round(2 * SIM_DT * 1000))
    ctx.dispose()
  })
  it('releases pools/events/listeners once and starts the next attempt with clean state and seed', () => {
    const first = context()
    const cleanup = vi.fn()
    first.own(cleanup)
    first.simulation.step(moveFire)
    first.events.publish({ type: 'enemy_destroyed', eventId: 'queued', kind: 'miniboss', creditedToPlayer: true })
    const snapshot = first.simulation.snapshot
    first.dispose(); first.dispose(); first.simulation.step()
    expect(cleanup).toHaveBeenCalledOnce()
    expect(first.shots.activeShots).toHaveLength(0)
    expect(first.events.drain()).toHaveLength(0)
    expect(first.simulation.snapshot).toBe(snapshot)
    const second = context('two')
    expect(second.results.metadata.seed).toBe('seed-two')
    expect(second.sheet).not.toBe(first.sheet)
    expect(second.simulation.snapshot).toMatchObject({ tick: 0, score: 0, kills: 0, elapsedSec: 0, shots: [], player: { x: 0, z: 0 } })
    expect(second.firing.shooting).toBe(false)
    second.simulation.step(EMPTY_RUN_INPUT)
    expect(second.results.score).toBe(0)
    second.dispose()
  })
  it('converts the logical X/Z plane at the View boundary without swapping controls', () => {
    expect(playfieldToWorld({ x: 3, z: -7 })).toEqual({ x: 3, y: 0, z: -7 })
    expect(worldToPlayfield(playfieldToWorld({ x: -5, z: 2 }, 10))).toEqual({ x: -5, z: 2 })
  })
})
