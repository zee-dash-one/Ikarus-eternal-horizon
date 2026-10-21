import type { RunMetadata } from '../../../shared/rankings.ts'
import type { AsteroidSegment, CooldownCurve, EnemySpawn, ResolvedSector, RunPreparationBalance, SpawnPoint, SprintPlan, WavePlan } from '../core/run-plan.ts'
import { WAVES_PER_SPRINT } from '../core/run-plan.ts'
import { deriveSeed, freezeData, requirePreparation, seededRandom } from '../core/seeded-random.ts'
import type { SpawnPointManager } from './spawn-point-manager.ts'
import { SIM_DT } from '../core/game-loop.ts'

function integer(value: number, min: number, max: number): boolean { return Number.isSafeInteger(value) && value >= min && value <= max }
function pick<T>(rows: readonly T[], random: () => number): T { const row = rows[Math.floor(random() * rows.length)]; requirePreparation(row !== undefined, 'seleção vazia'); return row }
function position(point: SpawnPoint, random: () => number) { return { x: point.position.x + (random() * 2 - 1) * point.halfExtents.x, z: point.position.z + (random() * 2 - 1) * point.halfExtents.z } }
export function cooldownTicks(curve: CooldownCurve, sprint: number, wave = 0): number {
  const sec = Math.max(curve.minSec, Math.min(curve.maxSec, curve.baseSec - (sprint - 1) * curve.perSprintSec - wave * curve.perWaveSec))
  return Math.max(1, Math.ceil(sec / SIM_DT))
}

export class SprintPlanManager {
  readonly balance: RunPreparationBalance
  constructor(balance: RunPreparationBalance, readonly spawns: SpawnPointManager) {
    this.balance = freezeData(structuredClone(balance))
    requirePreparation(balance.version.length > 0, 'versão de balance ausente')
    for (const curve of [balance.enemy.cooldown, balance.asteroid.cooldown]) requirePreparation(Object.values(curve).every(Number.isFinite) && curve.minSec > 0 && curve.maxSec >= curve.minSec && curve.maxSec <= 60 && curve.baseSec >= curve.minSec && curve.baseSec <= curve.maxSec && curve.perSprintSec >= 0 && curve.perWaveSec >= 0, 'curva de cooldown inválida')
    const e = balance.enemy, a = balance.asteroid
    requirePreparation(integer(e.budget, 1, 128) && integer(e.prewarm, 1, e.budget) && integer(e.minCount, 1, 8) && integer(e.maxCount, e.minCount, Math.min(8, e.budget)) && e.prewarm >= e.maxCount && integer(e.growthEveryWaves, 1, 49) && integer(e.spacingTicks, 1, 600), 'limites de inimigos inválidos')
    requirePreparation(integer(a.budget, 1, 128) && integer(a.firstBatch, 1, a.budget) && integer(a.segmentTicks, 60, 36000) && integer(a.maxEventsPerSegment, a.firstBatch, 4096) && integer(a.firstDelayTicks, 0, a.segmentTicks - 1) && Number.isFinite(a.minSpeed) && a.minSpeed > 0 && a.maxSpeed >= a.minSpeed && Number.isFinite(a.maxSpeed) && Number.isFinite(a.lateralSpeed) && a.lateralSpeed >= 0, 'limites de asteroides inválidos')
    requirePreparation(a.cooldown.perWaveSec === 0, 'agenda de asteroides não depende de wave inimiga')
    requirePreparation(Math.ceil(a.segmentTicks / cooldownTicks(a.cooldown, 1_000_000)) <= a.maxEventsPerSegment, 'segmento excede orçamento de eventos')
    requirePreparation(spawns.enemies.length > 0 && spawns.asteroids.length > 0 && spawns.enemies.every((point) => point.capacity <= e.budget) && spawns.asteroids.every((point) => point.capacity <= a.budget), 'spawn/capacidade incompatível com orçamento')
    requirePreparation(spawns.enemies.some((point) => point.capacity >= e.maxCount) && spawns.asteroids.every((point) => point.capacity >= a.firstBatch), 'capacidade insuficiente para primeiro encontro/waves')
  }
  plan(metadata: RunMetadata, sprintIndex: number, sector: ResolvedSector): SprintPlan {
    const work = this.prepare(metadata, sprintIndex, sector)
    let item = work.next()
    while (!item.done) item = work.next()
    return item.value
  }
  /** One bounded wave per yield. Drain only from preparation/frame work, never sim. */
  *prepare(metadata: RunMetadata, sprintIndex: number, sector: ResolvedSector): Generator<void, SprintPlan> {
    requirePreparation(integer(sprintIndex, 1, 1_000_000) && metadata.seed.length > 0 && metadata.contentVersion.length > 0, 'seed/versão/sprint inválida')
    const seed = deriveSeed(metadata.seed, metadata.contentVersion, this.balance.version, sprintIndex, sector.sector.id)
    const random = seededRandom(deriveSeed(seed, 'enemies'))
    const waves: WavePlan[] = []
    for (let waveIndex = 0; waveIndex < WAVES_PER_SPRINT; waveIndex++) {
      const boss = waveIndex === WAVES_PER_SPRINT - 1
      const archetype = boss ? sector.miniboss : pick(sector.drones, random)
      const count = boss ? 1 : Math.min(this.balance.enemy.maxCount, this.balance.enemy.minCount + Math.floor(waveIndex / this.balance.enemy.growthEveryWaves) + Math.min(5, sprintIndex - 1))
      const formations = sector.sector.formations.filter((formation) => formation !== 'Circle' || count >= 4)
      const formation = boss ? null : pick(formations, random)
      const point = pick(this.spawns.enemies.filter((row) => row.capacity >= count), random)
      const enemies: EnemySpawn[] = Array.from({ length: count }, (_, slot) => ({
        id: `s${sprintIndex}-w${waveIndex}-e${slot}`, archetypeId: archetype.id, factionId: archetype.factionId, class: archetype.class,
        squadId: boss ? null : `s${sprintIndex}-w${waveIndex}-squad0`, formation, slot,
        spawnPointId: point.id, position: position(point, random), direction: { ...point.direction }, offsetTicks: slot * this.balance.enemy.spacingTicks,
      }))
      waves.push({ waveIndex, kind: boss ? 'miniboss' : 'regular', cooldownTicks: cooldownTicks(this.balance.enemy.cooldown, sprintIndex, waveIndex), completion: boss ? 'miniboss-defeated-and-cleared' : 'all-emitted-and-cleared', enemies })
      yield
    }
    return freezeData({ sprintIndex, sectorId: sector.sector.id, seed, contentVersion: metadata.contentVersion, balanceVersion: this.balance.version,
      enemyBudget: this.balance.enemy.budget, asteroidBudget: this.balance.asteroid.budget, asteroidIntervalTicks: cooldownTicks(this.balance.asteroid.cooldown, sprintIndex), waves,
      asteroids: this.asteroidSegment(seed, sprintIndex, sector, 0) })
  }
  asteroidSegment(seed: string, sprintIndex: number, sector: ResolvedSector, index: number): AsteroidSegment {
    requirePreparation(integer(index, 0, 1_000_000) && integer(sprintIndex, 1, 1_000_000), 'índice de segmento/sprint inválido')
    const a = this.balance.asteroid, startTick = index * a.segmentTicks, endTick = startTick + a.segmentTicks
    const random = seededRandom(deriveSeed(seed, 'asteroids', index))
    const totalWeight = sector.sector.asteroidMix.reduce((sum, row) => sum + row.weight, 0)
    const interval = cooldownTicks(a.cooldown, sprintIndex)
    const events = []
    const firstTick = a.firstDelayTicks + Math.max(0, Math.ceil((startTick - a.firstDelayTicks) / interval)) * interval
    for (let tick = firstTick; tick < endTick; tick += interval) {
      requirePreparation(events.length < a.maxEventsPerSegment, 'segmento de asteroides excedido')
      let choice = random() * totalWeight
      const mix = sector.sector.asteroidMix.find((row) => { choice -= row.weight; return choice < 0 }) ?? sector.sector.asteroidMix[0]
      requirePreparation(mix, 'mix vazio')
      const point = pick(this.spawns.asteroids, random), speed = a.minSpeed + random() * (a.maxSpeed - a.minSpeed), lateral = (random() * 2 - 1) * a.lateralSpeed
      events.push({ id: `s${sprintIndex}-a${index}-${events.length}`, tick, size: mix.size, spawnPointId: point.id, position: position(point, random), velocity: { x: point.direction.x * speed + point.direction.z * lateral, z: point.direction.z * speed - point.direction.x * lateral } })
    }
    requirePreparation(index !== 0 || events.length >= a.firstBatch, 'segmento inicial menor que o lote reservado')
    return freezeData({ index, startTick, endTick, events })
  }
}
