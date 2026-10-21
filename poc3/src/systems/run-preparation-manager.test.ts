import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'
import type { PreparationStep, PreparedRunView } from '../core/run-plan.ts'
import { RunPreparationManager } from './run-preparation-manager.ts'
import { RunResultManager } from './run-result-manager.ts'
import type { PreparationConfig, PreparationPorts } from './run-preparation-manager.ts'
import { EnemyManager } from './enemy-manager.ts'
import { MeteorManager } from './meteor-manager.ts'

const steps: PreparationStep[] = ['enemy-points', 'asteroid-points', 'parallax', 'sector', 'sprint-plan', 'first-encounter']
function fixture() {
  const results = new RunResultManager({ runId: 'test', mode: 'normal', seed: 'test-seed', buildVersion: 'test', contentVersion: RUN_CONTENT_VERSION })
  const view: PreparedRunView = { layerCount: 3, dispose: vi.fn(), warmup: vi.fn() }
  const config: PreparationConfig = structuredClone({ world: BALANCE.world, preparation: BALANCE.preparation, parallax: BALANCE.parallax.layers })
  const controller = new AbortController()
  const progress: PreparationStep[] = []
  const ports: PreparationPorts = { createView: vi.fn(() => view), yieldControl: async () => {}, onProgress: (p) => { progress.push(p.step); expect(results.elapsedSec).toBe(0); expect(results.score).toBe(0) } }
  const prepare = () => new RunPreparationManager().prepare(results, config, controller.signal, ports)
  return { results, view, config, controller, ports, progress, prepare }
}
describe('RunPreparationManager / D01–D11', () => {
  it('prepares in order with zero combat ticks and stages only wave 0 plus the first batch', async () => {
    const t = fixture(), ctx = await t.prepare(), world = ctx.prepared
    if (!world) throw new Error('Missing prepared world')
    expect(t.progress).toEqual(steps)
    expect(ctx.simulation.snapshot.tick).toBe(0)
    expect(ctx.results.elapsedSec).toBe(0)
    expect(world.plan.waves).toHaveLength(50)
    expect(world.enemies.reservedCount).toBe(world.plan.waves[0]?.enemies.length)
    expect(world.meteors.reservedCount).toBe(BALANCE.preparation.asteroid.firstBatch)
    expect(world.enemies.activeCount + world.meteors.activeCount).toBe(0)
    expect([...world.enemies.staged, ...world.meteors.staged].every((item) => !item.active && !item.collidable)).toBe(true)
    expect(world.enemies.staged.every((item) => item.sheet.full.generic.length > 0)).toBe(true)
    expect(t.view.warmup).toHaveBeenCalledWith({ enemies: world.plan.waves[0]?.enemies, asteroids: world.plan.asteroids.events.slice(0, 3) })
    ctx.simulation.step()
    expect(world.enemies.activeCount + world.meteors.activeCount).toBe(0)
    ctx.dispose(); ctx.dispose()
    expect(world.enemies.reservedCount + world.meteors.reservedCount).toBe(0)
    expect(t.view.dispose).toHaveBeenCalledOnce()
    expect(ctx.prepared).toBeNull()
  })
  it.each(steps)('cancellation after %s frees partial resources and never returns READY data', async (step) => {
    const t = fixture()
    t.ports.onProgress = (progress) => { t.progress.push(progress.step); if (progress.step === step) t.controller.abort() }
    await expect(t.prepare()).rejects.toThrow(/cancelada/)
    expect(t.progress[t.progress.length - 1]).toBe(step)
    expect(t.view.dispose).toHaveBeenCalledTimes(steps.indexOf(step) >= 2 ? 1 : 0)
  })
  it('releases prepared View immediately while an asynchronous warmup is still pending', async () => {
    const t = fixture()
    let release!: () => void
    let reached!: () => void
    const warming = new Promise<void>((resolve) => { reached = resolve })
    t.view.warmup = () => { reached(); return new Promise<void>((resolve) => { release = resolve }) }
    const pending = t.prepare()
    await warming
    t.controller.abort()
    expect(t.view.dispose).toHaveBeenCalledOnce()
    release()
    await expect(pending).rejects.toThrow(/cancelada/)
    expect(t.view.dispose).toHaveBeenCalledOnce()
  })
  it('rolls back a failed warmup, and a fresh attempt can prepare successfully', async () => {
    const t = fixture()
    vi.mocked(t.view.warmup).mockImplementationOnce(() => { throw new Error('GPU allocation failed') })
    await expect(t.prepare()).rejects.toThrow(/GPU allocation/)
    expect(t.view.dispose).toHaveBeenCalledOnce()
    expect(t.results.observeIntegrity('DEAD', '2026-10-19T00:00:00.000Z')).toBeNull()
    const retry = await fixture().prepare()
    expect(retry.prepared?.plan.waves).toHaveLength(50)
    retry.dispose()
  })
  it('pins a configuration snapshot before yielding so late edits cannot change this plan', async () => {
    const t = fixture()
    t.ports.onProgress = (p) => {
      if (p.step === 'enemy-points') {
        Reflect.set(t.config.preparation.enemy, 'maxCount', 0)
        const layer = t.config.parallax[0]
        if (layer) Reflect.set(layer, 'count', 1)
      }
    }
    const ctx = await t.prepare()
    expect(ctx.prepared?.planner.balance.enemy.maxCount).toBe(8)
    expect(vi.mocked(t.ports.createView).mock.calls[0]?.[0][0]?.count).toBe(400)
    ctx.dispose()
  })
  it('rejects bad content versions, missing sectors and invalid parallax counts before mounting', async () => {
    const old = fixture()
    const result = new RunResultManager({ ...old.results.metadata, contentVersion: 'old' })
    await expect(new RunPreparationManager().prepare(result, old.config, old.controller.signal, old.ports)).rejects.toThrow(/versão do conteúdo/)
    expect(old.ports.createView).not.toHaveBeenCalled()
    const missing = fixture()
    Reflect.set(missing.config.preparation, 'sectorOrder', ['missing'])
    await expect(missing.prepare()).rejects.toThrow(/setor desconhecido/)
    expect(missing.view.dispose).toHaveBeenCalledOnce()
    const layers = fixture()
    Reflect.set(layers.config, 'parallax', [])
    await expect(layers.prepare()).rejects.toThrow(/três camadas/)
    expect(layers.ports.createView).not.toHaveBeenCalled()
  })
  it('rolls back all enemy reservations if a mandatory wave does not fit', async () => {
    const ctx = await fixture().prepare(), world = ctx.prepared
    if (!world || !world.plan.waves[0]) throw new Error('Missing world')
    const enemies = new EnemyManager(2, 2)
    expect(() => enemies.stageWave(world.plan.waves[0], world.spawns)).toThrow(/pool de inimigos/)
    expect(enemies.reservedCount).toBe(0)
    expect(enemies.staged).toHaveLength(0)
    enemies.dispose(); ctx.dispose()
  })
  it('rolls back all asteroid reservations on insufficient pool capacity', async () => {
    const ctx = await fixture().prepare(), world = ctx.prepared
    if (!world) throw new Error('Missing world')
    const meteors = new MeteorManager(2, 2)
    expect(() => meteors.stage(world.plan.asteroids.events.slice(0, 3), world.spawns)).toThrow(/pool de asteroides/)
    expect(meteors.reservedCount).toBe(0)
    expect(meteors.staged).toHaveLength(0)
    meteors.dispose(); ctx.dispose()
  })
})
