import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'
import { RunPreparationManager } from './run-preparation-manager.ts'
import { RunResultManager } from './run-result-manager.ts'
import type { RunContext } from './run-context.ts'
import { EnemyManager } from './enemy-manager.ts'
import { MeteorManager } from './meteor-manager.ts'
import { sweepTime } from './combat-manager.ts'
import { SIM_DT } from '../core/game-loop.ts'

async function fixture() {
  return new RunPreparationManager().prepare(new RunResultManager({ runId: 'combat', mode: 'normal', seed: 'combat-seed', buildVersion: 'test', contentVersion: RUN_CONTENT_VERSION }),
    { world: BALANCE.world, preparation: BALANCE.preparation, parallax: BALANCE.parallax.layers }, new AbortController().signal,
    { createView: () => ({ layerCount: 3, warmup() {}, dispose() {} }), yieldControl: async () => {} })
}
function enter(ctx: RunContext) { for (let i = 0; i < BALANCE.combat.entryTicks; i++) ctx.simulation.step() }
function defeat(ctx: RunContext) {
  const enemies = ctx.prepared?.enemies
  if (!enemies) return
  for (const e of [...enemies.staged]) if (e.active) {
    enemies.hit(e, 1e8, ctx.events); enemies.hit(e, 1e8, ctx.events)
  }
}

describe('Part E / entry and sprint execution', () => {
  it('gates input, fire, damage clocks and score before PlayerEntryCompleted, and freezes entry on pause', async () => {
    const ctx = await fixture(), initial = ctx.simulation.snapshot
    ctx.simulation.step({ moveX: 1, moveZ: -1, held: ['A'], pressed: ['R1'] })
    expect(ctx.simulation.snapshot.player.x).toBe(0)
    expect(ctx.simulation.snapshot.player.z).toBeLessThan(initial.player.z)
    expect(ctx.results.elapsedSec).toBe(0)
    expect(ctx.prepared?.enemies.activeCount).toBe(0)
    expect(ctx.shots.activeShots).toHaveLength(0)
    ctx.simulation.setPaused(true)
    const paused = ctx.simulation.snapshot
    for (let i = 0; i < 200; i++) ctx.simulation.step()
    expect(ctx.simulation.snapshot).toBe(paused)
    ctx.simulation.setPaused(false)
    for (let i = 1; i < BALANCE.combat.entryTicks; i++) ctx.simulation.step()
    expect(ctx.simulation.events.filter((e) => e.type === 'PlayerEntryCompleted')).toHaveLength(1)
    expect(ctx.simulation.snapshot.player.z).toBe(0)
    expect(ctx.results.elapsedSec).toBe(0)
    ctx.simulation.step()
    expect(ctx.results.elapsedSec).toBeCloseTo(SIM_DT)
    expect(ctx.prepared?.enemies.activeCount).toBe(1)
    ctx.dispose()
  })
  it('executes two full sprints with 50 unique ordered waves each and defeats miniboss 49 before handoff', async () => {
    const ctx = await fixture(), seen: string[] = [], bosses: string[] = []
    // This acceptance harness checks scheduling; independently seeded hazards must not end it early.
    ctx.sheet.resetCombat(1e6, 1e6, BALANCE.sheet.playerDefaults.SPD)
    const planner = ctx.prepared?.planner
    if (!planner) throw new Error('world missing')
    const directPlan = vi.spyOn(planner, 'plan'), segment = vi.spyOn(planner, 'asteroidSegment')
    let maximumPlans = 0, maximumEnemies = 0, maximumMeteors = 0
    for (let i = 0; i < 40000 && (ctx.waves?.plan.sprintIndex ?? 0) < 3; i++) {
      ctx.waves?.prepareFrame()
      maximumPlans = Math.max(maximumPlans, ctx.waves?.retainedPlans ?? 0)
      const callsBefore = segment.mock.calls.length
      defeat(ctx)
      ctx.simulation.step()
      expect(segment.mock.calls.length).toBe(callsBefore)
      for (const event of ctx.simulation.events) {
        if (event.type === 'WaveStarted') { seen.push(`${event.sprintIndex}:${event.waveIndex}`); if (event.miniboss) bosses.push(`${event.sprintIndex}:${event.waveIndex}`) }
      }
      maximumEnemies = Math.max(maximumEnemies, ctx.prepared?.enemies.reservedCount ?? 0)
      maximumMeteors = Math.max(maximumMeteors, ctx.prepared?.meteors.reservedCount ?? 0)
      expect(ctx.results.pendingCreditCount).toBeLessThanOrEqual(BALANCE.preparation.enemy.budget + BALANCE.preparation.asteroid.budget)
    }
    expect(ctx.waves?.plan.sprintIndex).toBe(3)
    expect(seen.filter((id) => !id.startsWith('3:'))).toEqual(Array.from({ length: 100 }, (_, i) => `${Math.floor(i / 50) + 1}:${i % 50}`))
    expect(new Set(seen).size).toBe(seen.length)
    expect(bosses).toEqual(['1:49', '2:49'])
    expect(ctx.results.kills).toBeGreaterThan(100)
    expect(directPlan).not.toHaveBeenCalled()
    expect(maximumPlans).toBe(2)
    expect(maximumEnemies).toBeLessThanOrEqual(BALANCE.preparation.enemy.budget)
    expect(maximumMeteors).toBeLessThanOrEqual(BALANCE.preparation.asteroid.budget)
    expect(ctx.prepared?.meteors.activeCount).toBe(0)
    ctx.dispose()
  })
  it('waits safely for a late next plan, freezes clocks and retires old meteors without rewards', async () => {
    const ctx = await fixture(); enter(ctx)
    for (let i = 0; i < 20000 && ctx.waves?.phase !== 'TRANSITION'; i++) { defeat(ctx); ctx.simulation.step() }
    expect(ctx.waves?.phase).toBe('TRANSITION')
    expect(ctx.prepared?.meteors.reservedCount).toBe(0)
    const score = ctx.results.score, time = ctx.results.elapsedSec
    for (let i = 0; i < 100; i++) ctx.simulation.step({ moveX: 1, moveZ: 1, held: ['A'], pressed: [] })
    expect(ctx.results.score).toBe(score); expect(ctx.results.elapsedSec).toBe(time)
    expect(ctx.waves?.plan.sprintIndex).toBe(1)
    for (let i = 0; i < 11; i++) ctx.waves?.prepareFrame()
    ctx.simulation.step()
    expect(ctx.waves?.plan.sprintIndex).toBe(2)
    expect(ctx.waves?.sector.sector.id).toBe(BALANCE.preparation.sectorOrder[1])
    ctx.dispose()
    const snapshot = ctx.simulation.snapshot
    ctx.waves?.prepareFrame(); ctx.simulation.step()
    expect(ctx.simulation.snapshot).toBe(snapshot)
    expect(ctx.prepared).toBeNull()
  })
  it('bounds look-ahead work per frame without changing the running plan or active population', async () => {
    const ctx = await fixture(); enter(ctx)
    const plan = ctx.prepared?.plan
    ctx.waves?.prepareFrame()
    expect(ctx.waves?.nextReady).toBe(false)
    expect(ctx.prepared?.plan).toBe(plan)
    expect(ctx.prepared?.enemies.activeCount).toBe(0)
    for (let i = 0; i < 10; i++) ctx.waves?.prepareFrame()
    expect(ctx.waves?.nextReady).toBe(true)
    for (let i = 0; i < 100; i++) ctx.waves?.prepareFrame()
    expect(ctx.waves?.retainedPlans).toBe(2)
    expect(ctx.prepared?.plan).toBe(plan)
    ctx.dispose()
  })
  it('credits destruction once and rejects replay after the pool slot has been recycled', async () => {
    const ctx = await fixture(); enter(ctx); ctx.simulation.step()
    const craft = ctx.prepared?.enemies.staged.find((e) => e.active), id = craft?.spawn?.id
    if (!craft || !id) throw new Error('missing active craft')
    defeat(ctx); ctx.simulation.step()
    const score = ctx.results.score
    expect(score).toBe(100)
    ctx.events.publish({ type: 'enemy_destroyed', eventId: id, kind: 'enemy', creditedToPlayer: true })
    ctx.simulation.step()
    expect(ctx.results.score).toBe(score)
    ctx.dispose()
  })
  it('mandatory spawns wait on a full pool without emitting a backlog burst, including miniboss', async () => {
    const ctx = await fixture(); enter(ctx)
    const world = ctx.prepared
    if (!world) throw new Error('missing world')
    world.enemies.clear()
    const first = world.plan.waves[0]?.enemies[0], boss = world.plan.waves[49]?.enemies[0]
    if (!first || !boss) throw new Error('missing descriptors')
    for (let i = 0; i < world.plan.enemyBudget; i++) expect(world.enemies.emit({ ...first, id: `occupied-${i}` }, 1, 0, false)).toBe(true)
    for (let i = 0; i < 100; i++) ctx.simulation.step()
    expect(ctx.waves?.waitingForEnemyPool).toBe(true)
    expect(world.enemies.emit(boss, 1, 49, true)).toBe(false)
    const victims = [...world.enemies.staged].slice(0, 3)
    for (const e of victims) world.enemies.retire(e)
    ctx.simulation.step()
    expect(world.enemies.staged.filter((e) => e.spawn?.id.startsWith('s1-w0-'))).toHaveLength(1)
    expect(world.enemies.emit(boss, 1, 49, true)).toBe(true)
    const craft = world.enemies.staged.find((e) => e.boss)
    expect(craft?.spawn?.id).toBe(boss.id)
    ctx.dispose()
  })
})

describe('Part E / pooled hazards and collision', () => {
  it('handles relative swept motion and nearest impact without tunnelling', () => {
    expect(sweepTime(0, 0, 0, -100, 0, -50, 0, -40, 1)).toBeCloseTo(49 / 110)
    expect(sweepTime(0, 0, 0, -100, 5, -50, 5, -40, 1)).toBeNull()
  })
  it('emits meteor score and drop once only on destruction; pool exhaustion and despawn give none', async () => {
    const ctx = await fixture(), descriptor = ctx.prepared?.plan.asteroids.events[0]
    if (!descriptor) throw new Error('missing meteor')
    const manager = new MeteorManager(1, 1)
    expect(manager.emit(descriptor)).toBe(true)
    expect(manager.emit({ ...descriptor, id: 'overflow' })).toBe(false)
    expect(manager.omitted).toBe(1)
    const m = manager.staged[0]
    if (!m) throw new Error('missing live meteor')
    manager.hit(m, 1e6, ctx.events); manager.hit(m, 1e6, ctx.events)
    expect(ctx.events.drain().map((e) => e.type)).toEqual(['meteor_destroyed', 'drop_requested'])
    expect(manager.emit({ ...descriptor, id: 'offfield', position: { x: 0, z: BALANCE.world.maxZ + 50 } })).toBe(true)
    manager.updateSim(SIM_DT)
    expect(manager.reservedCount).toBe(0)
    expect(ctx.events.drain()).toHaveLength(0)
    manager.dispose(); ctx.dispose()
  })
  it('reuses enemy CHAR and emits no kill on retreat; a miniboss never retreats', async () => {
    const ctx = await fixture(), descriptor = ctx.prepared?.plan.waves[0]?.enemies[0]
    if (!descriptor) throw new Error('missing enemy')
    const manager = new EnemyManager(1, 1)
    manager.emit(descriptor, 1, 0, false)
    const craft = manager.staged[0]
    if (!craft) throw new Error('missing craft')
    const sheet = craft.sheet
    craft.base.strategy = 'Fury'; craft.base.ticks = 999; craft.z = BALANCE.world.maxZ + 100
    manager.updateSim(SIM_DT)
    expect(manager.activeCount).toBe(0)
    expect(ctx.events.drain()).toHaveLength(0)
    manager.emit({ ...descriptor, id: 'boss', class: 'Special' }, 2, 49, true)
    expect(manager.staged[0]?.sheet).toBe(sheet)
    expect(manager.staged[0]?.sheet.summary.integrityState).toBe('LIGHT')
    craft.base.strategy = 'Fury'; craft.base.ticks = 999; craft.z = BALANCE.world.maxZ + 100
    manager.updateSim(SIM_DT)
    expect(manager.activeCount).toBe(1)
    manager.dispose(); ctx.dispose()
  })
})
