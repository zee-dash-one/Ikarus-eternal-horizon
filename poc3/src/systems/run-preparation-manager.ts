import type { ParallaxLayerBalance } from '../core/balancer.ts'
import type { EncounterVisualBalance, PreparationProgress, PreparationStep, PreparedRunView, Rect, ResolvedSector, RunPreparationBalance, SprintPlan } from '../core/run-plan.ts'
import { deriveSeed, freezeData, requirePreparation } from '../core/seeded-random.ts'
import { SpawnPointManager } from './spawn-point-manager.ts'
import { SectorManager } from './sector-manager.ts'
import { SprintPlanManager } from './sprint-plan-manager.ts'
import { RunContext } from './run-context.ts'
import type { RunResultManager } from './run-result-manager.ts'
import { EnemyManager } from './enemy-manager.ts'
import { MeteorManager } from './meteor-manager.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'

export interface PreparedWorld {
  readonly spawns: SpawnPointManager
  readonly sector: ResolvedSector
  readonly plan: SprintPlan
  readonly planner: SprintPlanManager
  readonly enemies: EnemyManager
  readonly meteors: MeteorManager
  readonly view: PreparedRunView
}
export interface PreparationConfig { readonly world: Rect; readonly preparation: RunPreparationBalance; readonly parallax: readonly ParallaxLayerBalance[] }
export interface PreparationPorts {
  createView(layers: readonly ParallaxLayerBalance[], visuals: EncounterVisualBalance, cosmeticSeed: string): PreparedRunView
  yieldControl(signal: AbortSignal): Promise<void>
  onProgress?(progress: PreparationProgress): void
}

/** Ordered async staging only. Never called by RunSimulation or a scene update. */
export class RunPreparationManager {
  async prepare(results: RunResultManager, config: PreparationConfig, signal: AbortSignal, ports: PreparationPorts): Promise<RunContext> {
    const snapshot = freezeData(structuredClone(config)), balance = snapshot.preparation
    let view: PreparedRunView | null = null
    let context: RunContext | null = null
    let releasedView: PreparedRunView | null = null
    const cleanup = () => {
      if (context) { context.dispose(); releasedView = view }
      else {
        results.cancel()
        if (view && releasedView !== view) { view.dispose(); releasedView = view }
      }
    }
    signal.addEventListener('abort', cleanup, { once: true })
    const check = () => { if (signal.aborted) throw new Error('Preparação cancelada.') }
    let completed = 0
    const checkpoint = async (step: PreparationStep) => {
      check()
      ports.onProgress?.({ step, completed: ++completed, total: 6 })
      await ports.yieldControl(signal)
      check()
    }
    try {
      check()
      requirePreparation(results.metadata.contentVersion === RUN_CONTENT_VERSION, 'versão do conteúdo incompatível com o ticket')
      const spawns = new SpawnPointManager(snapshot.world, balance.safeEntry, balance.spawnMargin)
      spawns.createEnemies(balance.enemyPoints)
      await checkpoint('enemy-points')
      spawns.createAsteroids(balance.asteroidPoints)
      await checkpoint('asteroid-points')
      requirePreparation(snapshot.parallax.length === 3 && new Set(snapshot.parallax.map((layer) => layer.name)).size === 3, 'parallax requer três camadas distintas')
      requirePreparation(new Set(snapshot.parallax.map((layer) => layer.position.y)).size === 3 && snapshot.parallax.every((layer) =>
        layer.name.length > 0 && Number.isSafeInteger(layer.count) && layer.count > 0 && layer.count <= 4096 &&
        [layer.speed, layer.speedJitter, layer.parallaxGain, layer.size, layer.alpha, layer.gridSize, layer.gridOpacity, layer.zNearWrap, layer.zFar, ...Object.values(layer.position), ...Object.values(layer.rotation)].every(Number.isFinite) &&
        layer.speed >= 0 && layer.speedJitter >= 0 && layer.speedJitter <= 1 && layer.parallaxGain >= 0 && layer.size > 0 && layer.alpha >= 0 && layer.alpha <= 1 && layer.gridSize > 0 && layer.gridOpacity >= 0 && layer.gridOpacity <= 1 && layer.zFar < layer.zNearWrap && [layer.color, layer.gridColor].every((color) => Number.isSafeInteger(color) && color >= 0 && color <= 0xffffff)), 'configuração de parallax inválida')
      const visuals = balance.visuals
      requirePreparation([...Object.values(visuals.enemySize), ...Object.values(visuals.asteroidRadii)].every((size) => Number.isFinite(size) && size > 0 && size <= 100) && [...Object.values(visuals.enemyColors), visuals.asteroidColor].every((color) => Number.isSafeInteger(color) && color >= 0 && color <= 0xffffff), 'assets do encontro inválidos')
      view = ports.createView(snapshot.parallax, visuals, deriveSeed(results.metadata.seed, results.metadata.contentVersion, balance.version, 'cosmetics'))
      requirePreparation(view.layerCount === 3, 'View não preparou três camadas')
      await checkpoint('parallax')
      const sectors = new SectorManager(balance.catalog)
      requirePreparation(balance.sectorOrder.length > 0 && balance.sectorOrder.length <= 128, 'progressão de setores vazia/excedida')
      for (const sectorId of balance.sectorOrder) sectors.resolve(sectorId)
      const sectorId = balance.sectorOrder[0]
      requirePreparation(sectorId, 'setor inicial ausente')
      const sector = sectors.resolve(sectorId)
      await checkpoint('sector')
      const planner = new SprintPlanManager(balance, spawns)
      const plan = planner.plan(results.metadata, 1, sector)
      await checkpoint('sprint-plan')
      context = new RunContext(results)
      context.own(() => view?.dispose())
      const enemies = new EnemyManager(balance.enemy.budget, balance.enemy.prewarm)
      context.own(() => enemies.dispose())
      const meteors = new MeteorManager(balance.asteroid.budget, balance.asteroid.firstBatch)
      context.own(() => meteors.dispose())
      const firstWave = plan.waves[0]
      requirePreparation(firstWave, 'wave 0 ausente')
      const asteroids = plan.asteroids.events.slice(0, balance.asteroid.firstBatch)
      enemies.stageWave(firstWave, spawns)
      meteors.stage(asteroids, spawns)
      await view.warmup({ enemies: firstWave.enemies, asteroids })
      check()
      context.installPreparedWorld({ spawns, sector, plan, planner, enemies, meteors, view })
      await checkpoint('first-encounter')
      return context
    } catch (error) {
      cleanup()
      throw error
    } finally { signal.removeEventListener('abort', cleanup) }
  }
}
