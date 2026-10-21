import { describe, expect, it } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import type { RunPreparationBalance } from '../core/run-plan.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'
import { SpawnPointManager } from './spawn-point-manager.ts'
import { SectorManager } from './sector-manager.ts'
import { SprintPlanManager, cooldownTicks } from './sprint-plan-manager.ts'

const metadata = { runId: 'test', seed: 'stable-seed', mode: 'normal' as const, buildVersion: 'test', contentVersion: RUN_CONTENT_VERSION }
function setup(balance: RunPreparationBalance = BALANCE.preparation) {
  const spawns = new SpawnPointManager(BALANCE.world, balance.safeEntry, balance.spawnMargin)
  spawns.createEnemies(balance.enemyPoints); spawns.createAsteroids(balance.asteroidPoints)
  const sectors = new SectorManager(balance.catalog), sector = sectors.resolve('maldroid-frontier')
  return { spawns, sectors, sector, planner: new SprintPlanManager(balance, spawns) }
}
describe('SprintPlanManager', () => {
  it('reproduces the same immutable plan from seed/config/version with no ambient random', () => {
    const { planner, sector } = setup()
    const plan = planner.plan(metadata, 1, sector)
    expect(planner.plan(metadata, 1, sector)).toEqual(plan)
    expect(plan.waves.map((wave) => wave.waveIndex)).toEqual(Array.from({ length: 50 }, (_, index) => index))
    expect(Object.isFrozen(plan.waves[0]?.enemies[0]?.position)).toBe(true)
    expect(planner.plan({ ...metadata, seed: 'another-seed' }, 1, sector)).not.toEqual(plan)
    expect(planner.plan({ ...metadata, contentVersion: 'another-version' }, 1, sector).seed).not.toBe(plan.seed)
  })
  it('places a single required miniboss only in wave 49, never at a kill milestone', () => {
    const { planner, sector } = setup(), plan = planner.plan(metadata, 1, sector)
    expect(plan.waves.filter((wave) => wave.kind === 'miniboss')).toHaveLength(1)
    expect(plan.waves[49]).toMatchObject({ kind: 'miniboss', completion: 'miniboss-defeated-and-cleared' })
    expect(plan.waves[49]?.enemies).toHaveLength(1)
    expect(plan.waves[49]?.enemies[0]?.archetypeId).toBe(sector.miniboss.id)
    expect(plan.waves.slice(0, 49).every((wave) => wave.enemies.every((enemy) => enemy.class !== 'Special'))).toBe(true)
  })
  it('plans valid squads, spawn references, offsets and budgets for every wave', () => {
    const { planner, sector, spawns } = setup(), plan = planner.plan(metadata, 1, sector)
    const ids = new Set<string>()
    for (const wave of plan.waves) {
      expect(wave.enemies.length).toBeLessThanOrEqual(plan.enemyBudget)
      expect(wave.cooldownTicks).toBeGreaterThan(0)
      for (const enemy of wave.enemies) {
        expect(ids.has(enemy.id)).toBe(false); ids.add(enemy.id)
        const point = spawns.enemy(enemy.spawnPointId)
        expect(wave.enemies.length).toBeLessThanOrEqual(point.capacity)
        expect(Math.abs(enemy.position.x - point.position.x)).toBeLessThanOrEqual(point.halfExtents.x)
        expect(Math.abs(enemy.position.z - point.position.z)).toBeLessThanOrEqual(point.halfExtents.z)
        expect(enemy.offsetTicks).toBe(enemy.slot * BALANCE.preparation.enemy.spacingTicks)
        if (wave.kind === 'regular') {
          expect(enemy.squadId).toBeTruthy()
          expect(sector.sector.formations).toContain(enemy.formation)
          expect(new Set(wave.enemies.map((row) => row.class)).size).toBe(1)
          if (enemy.formation === 'Circle') expect(wave.enemies.length).toBeGreaterThanOrEqual(4)
        }
      }
    }
  })
  it('never mixes another sector/faction and keeps combat class independent from faction', () => {
    const { planner, sectors } = setup()
    for (const id of ['maldroid-frontier', 'hollow-belt']) {
      const sector = sectors.resolve(id), plan = planner.plan(metadata, 1, sector)
      const allowed = new Set([...sector.drones.map((row) => row.id), sector.miniboss.id])
      expect(plan.waves.flatMap((wave) => wave.enemies).every((enemy) => allowed.has(enemy.archetypeId) && sector.sector.factionIds.includes(enemy.factionId))).toBe(true)
      expect(new Set(sector.drones.map((row) => row.class)).size).toBe(3)
    }
  })
  it('extends an ordered finite asteroid timeline without cadence gaps or mutable history', () => {
    const { planner, sector, spawns } = setup(), plan = planner.plan(metadata, 1, sector)
    const next = planner.asteroidSegment(plan.seed, 1, sector, 1)
    expect(next).toEqual(planner.asteroidSegment(plan.seed, 1, sector, 1))
    const combined = [...plan.asteroids.events, ...next.events]
    expect(new Set(combined.map((event) => event.id)).size).toBe(combined.length)
    combined.forEach((event, index) => {
      if (index > 0) expect(event.tick - (combined[index - 1]?.tick ?? 0)).toBe(plan.asteroidIntervalTicks)
      expect(event.velocity.z).toBeGreaterThan(0)
      expect(sector.sector.asteroidMix.map((row) => row.size)).toContain(event.size)
      expect(spawns.asteroid(event.spawnPointId)).toBeTruthy()
    })
    expect(plan.asteroids.events.every((event) => event.tick < plan.asteroids.endTick)).toBe(true)
    expect(next.events.every((event) => event.tick >= next.startTick && event.tick < next.endTick)).toBe(true)
    expect(next.events.length).toBeLessThanOrEqual(BALANCE.preparation.asteroid.maxEventsPerSegment)
    expect(plan.asteroids.index).toBe(0)
  })
  it('does not change asteroid choices when enemy counts or enemy cooldowns change', () => {
    const a = setup(), original = a.planner.plan(metadata, 1, a.sector)
    const balance = { ...BALANCE.preparation, enemy: { ...BALANCE.preparation.enemy, minCount: 4, cooldown: { ...BALANCE.preparation.enemy.cooldown, baseSec: 3 } } }
    const b = setup(balance), changed = b.planner.plan(metadata, 1, b.sector)
    expect(changed.waves).not.toEqual(original.waves)
    expect(changed.asteroids).toEqual(original.asteroids)
  })
  it('clamps cooldowns and counts even on a very late sprint', () => {
    const { planner, sector } = setup(), plan = planner.plan(metadata, 1_000_000, sector)
    expect(plan.waves[0]?.cooldownTicks).toBe(cooldownTicks(BALANCE.preparation.enemy.cooldown, 1_000_000))
    expect(plan.waves.every((wave) => wave.enemies.length <= BALANCE.preparation.enemy.maxCount)).toBe(true)
    expect(plan.asteroidIntervalTicks).toBe(Math.ceil(BALANCE.preparation.asteroid.cooldown.minSec * 60))
    expect(() => planner.plan(metadata, 0, sector)).toThrow(/sprint inválida/)
  })
  it('rejects impossible budgets, counts, intervals and oversized timeline segments', () => {
    expect(() => setup({ ...BALANCE.preparation, enemy: { ...BALANCE.preparation.enemy, maxCount: 25 } })).toThrow(/limites de inimigos/)
    expect(() => setup({ ...BALANCE.preparation, asteroid: { ...BALANCE.preparation.asteroid, maxEventsPerSegment: 3 } })).toThrow(/orçamento de eventos/)
    expect(() => setup({ ...BALANCE.preparation, enemy: { ...BALANCE.preparation.enemy, cooldown: { ...BALANCE.preparation.enemy.cooldown, minSec: 0 } } })).toThrow(/cooldown/)
  })
})
