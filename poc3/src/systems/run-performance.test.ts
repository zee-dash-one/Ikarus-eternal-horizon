import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { BALANCE } from '../core/balancer.ts'
import { RunPreparationManager } from './run-preparation-manager.ts'
import { RunResultManager } from './run-result-manager.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'

it('measures a bounded full-pool headless combat workload and writes a local report', async () => {
  const ctx = await new RunPreparationManager().prepare(new RunResultManager({ runId: 'benchmark', mode: 'normal', seed: 'benchmark', contentVersion: RUN_CONTENT_VERSION, buildVersion: 'benchmark' }),
    { world: BALANCE.world, preparation: BALANCE.preparation, parallax: BALANCE.parallax.layers }, new AbortController().signal,
    { createView: () => ({ layerCount: 3, warmup() {}, dispose() {} }), yieldControl: async () => {} })
  for (let i = 0; i < BALANCE.combat.entryTicks; i++) ctx.simulation.step()
  const world = ctx.prepared
  if (!world) throw new Error('missing world')
  const enemy = world.plan.waves[0]?.enemies[0], asteroid = world.plan.asteroids.events[0]
  if (!enemy || !asteroid) throw new Error('missing descriptors')
  world.enemies.clear(); world.meteors.clear()
  ctx.sheet.resetCombat(1e6, 1e6, 12)
  for (let i = 0; i < world.plan.enemyBudget; i++) world.enemies.emit({ ...enemy, id: 'load-' + i, slot: i % 8 }, 1, 0, false)
  for (let i = 0; i < world.plan.asteroidBudget; i++) world.meteors.emit({ ...asteroid, id: 'load-m-' + i, position: { x: (i - 8) * 3, z: -50 }, velocity: { x: 0, z: 3 } })
  const samples: number[] = [], heapBefore = process.memoryUsage().heapUsed
  for (let i = 0; i < 1200; i++) {
    ctx.waves?.prepareFrame()
    if (i % 30 === 0) {
      while (ctx.shots.activeShots.length < BALANCE.weapons.laser.poolSize) {
        const shot = ctx.shots.acquire(); if (!shot) break
        shot.activate({ x: (ctx.shots.activeShots.length % 16 - 8) * 2, z: -8, vx: 0, vz: -10, lifetime: 2 })
      }
    }
    const start = performance.now(); ctx.simulation.step(); const elapsed = performance.now() - start
    if (i >= 120) samples.push(elapsed)
    expect(world.enemies.reservedCount).toBeLessThanOrEqual(world.plan.enemyBudget)
    expect(world.meteors.reservedCount).toBeLessThanOrEqual(world.plan.asteroidBudget)
  }
  samples.sort((a, b) => a - b)
  const report = { kind: 'headless-full-pools', samples: samples.length, fixedHz: 60, p50Ms: samples[Math.floor(samples.length * 0.5)], p95Ms: samples[Math.floor(samples.length * 0.95)], maxMs: samples[samples.length - 1], heapDeltaBytes: process.memoryUsage().heapUsed - heapBefore, retainedPlans: ctx.waves?.retainedPlans, limits: { enemies: world.plan.enemyBudget, meteors: world.plan.asteroidBudget, shots: BALANCE.weapons.laser.poolSize }, excludes: ['GPU/render FPS', 'audio', 'asset warmup', 'long-run heap leak proof'] }
  mkdirSync('benchmark-results', { recursive: true }); writeFileSync('benchmark-results/run.json', JSON.stringify(report, null, 2))
  expect(ctx.waves?.retainedPlans).toBe(2)
  ctx.dispose()
})
