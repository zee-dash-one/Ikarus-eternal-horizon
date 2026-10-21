import { BALANCE } from '../core/balancer.ts'
import type { EnemySpawn, WavePlan } from '../core/run-plan.ts'
import type { EventBus } from '../core/event.ts'
import { requirePreparation } from '../core/seeded-random.ts'
import { ObjectPool } from '../pools/object-pool.ts'
import { CharSheetManager } from './char-sheet-manager.ts'
import { DamageManager } from './damage-manager.ts'
import { SquadManager } from './squad-manager.ts'
import type { SpawnPointManager } from './spawn-point-manager.ts'

export type EnemyStrategy = 'EnterGate' | 'FindGroup' | 'LoopBack' | 'Flee' | 'Fury'
export class EnemyEntity {
  readonly sheet = CharSheetManager.create()
  readonly base: { id: string; strategy: EnemyStrategy; ticks: number } = { id: '', strategy: 'EnterGate', ticks: 0 }
  spawn: EnemySpawn | null = null
  active = false
  collidable = false
  x = 0; z = 0; previousX = 0; previousZ = 0; rotY = 0; age = 0; fireTicks = 0
  vx = 0; vz = 0; targetX = 0; targetZ = 0; boss = false; radius = 1
  reset(): void { this.spawn = null; this.active = false; this.collidable = false; this.base.id = '' }
}
export class EnemyBolt {
  active = false; id = 0; x = 0; z = 0; previousX = 0; previousZ = 0; vx = 0; vz = 0; life = 0
  reset(): void { this.active = false }
}

/** Pools and individual AI are independent of authored wave progression. */
export class EnemyManager {
  private readonly _pool: ObjectPool<EnemyEntity>
  private readonly _staged: EnemyEntity[] = []
  readonly squads = new SquadManager()
  readonly bolts: EnemyBolt[] = Array.from({ length: BALANCE.combat.enemy.shotBudget }, () => new EnemyBolt())
  private readonly _target = { x: 0, z: 0 }
  private _sequence = 0
  private _disposed = false
  private readonly _damage = new DamageManager()
  constructor(budget = BALANCE.preparation.enemy.budget, prewarm = BALANCE.preparation.enemy.prewarm) {
    requirePreparation(Number.isSafeInteger(budget) && budget > 0 && Number.isSafeInteger(prewarm) && prewarm >= 0 && prewarm <= budget, 'pool de inimigos inválido')
    // All runtime sheets are allocated before entry, including spare mandatory slots.
    this._pool = new ObjectPool(() => new EnemyEntity(), budget, budget)
  }
  get staged(): readonly EnemyEntity[] { return this._staged }
  get reservedCount(): number { return this._pool.activeCount }
  get activeCount(): number { let count = 0; for (const e of this._staged) if (e.active) count++; return count }
  stageWave(wave: WavePlan, spawns: SpawnPointManager): void {
    requirePreparation(!this._disposed && !this._staged.length, 'reserva de inimigos indisponível')
    const counts = new Map<string, number>()
    try {
      for (const descriptor of wave.enemies) {
        const point = spawns.enemy(descriptor.spawnPointId), count = (counts.get(point.id) ?? 0) + 1
        requirePreparation(count <= point.capacity, 'wave excede capacidade do spawn'); counts.set(point.id, count)
        const craft = this._pool.acquire(); requirePreparation(craft, 'wave excede pool de inimigos')
        craft.spawn = descriptor; this._staged.push(craft)
      }
    } catch (error) { this.clear(); throw error }
  }
  emit(spawn: EnemySpawn, sprint: number, wave: number, boss: boolean): boolean {
    if (this._disposed) return false
    let craft = this._staged.find((e) => e.spawn?.id === spawn.id && !e.active)
    if (!craft) { craft = this._pool.acquire() ?? undefined; if (!craft) return false; this._staged.push(craft) }
    const cfg = BALANCE.combat.enemy
    const scale = Math.min(cfg.maxHpMultiplier, 1 + (sprint - 1) * cfg.perSprintHp + wave * cfg.perWaveHp)
    craft.spawn = spawn; craft.active = true; craft.collidable = true; craft.boss = boss
    craft.sheet.resetCombat(cfg.hp[spawn.class] * scale, cfg.shield[spawn.class] * scale, cfg.speed[spawn.class])
    craft.x = craft.previousX = spawn.position.x; craft.z = craft.previousZ = spawn.position.z
    craft.vx = craft.vz = craft.age = 0; craft.rotY = Math.atan2(spawn.direction.x, spawn.direction.z)
    craft.base.id = spawn.id; craft.base.strategy = 'EnterGate'; craft.base.ticks = cfg.gateTicks
    craft.fireTicks = cfg.fireTicks + spawn.slot * 7
    craft.radius = boss ? cfg.bossRadius : cfg.radius
    return true
  }
  hit(craft: EnemyEntity, amount: number, events: EventBus): void {
    if (!craft.active || !craft.spawn) return
    this._damage.applyDamage({ target: craft.sheet, rawDamage: amount })
    if (craft.sheet.summary.integrityState === 'DEAD') {
      events.publish({ type: 'enemy_destroyed', eventId: craft.spawn.id, kind: craft.boss ? 'miniboss' : 'enemy', creditedToPlayer: true })
      events.publish({ type: 'drop_requested', source: 'enemy', ...(craft.boss ? { rank: 'miniboss' as const } : {}), sourceId: craft.spawn.id, x: craft.x, z: craft.z })
      this.retire(craft)
    }
  }
  retire(craft: EnemyEntity): void {
    const index = this._staged.indexOf(craft)
    if (index >= 0) { this._staged.splice(index, 1); this._pool.release(craft) }
  }
  updateSim(dt = 0, playerX = 0, playerZ = 0, random: () => number = () => 0.5): void {
    if (!dt || this._disposed) return
    const cfg = BALANCE.combat.enemy, squad = BALANCE.combat.squad
    this.squads.update(this._staged)
    for (let i = this._staged.length - 1; i >= 0; i--) {
      const e = this._staged[i]; if (!e?.active || !e.spawn) continue
      e.previousX = e.x; e.previousZ = e.z; e.age++; e.base.ticks--
      this.squads.target(e.spawn, playerX, playerZ, this._target)
      let tx = this._target.x, tz = this._target.z
      if (e.base.strategy === 'EnterGate') {
        const t = Math.min(1, e.age / cfg.gateTicks), u = 1 - Math.pow(1 - t, 3)
        e.x = e.spawn.position.x + (tx - e.spawn.position.x) * u
        e.z = e.spawn.position.z + (tz - e.spawn.position.z) * u
        if (t >= 1) { e.base.strategy = 'FindGroup'; e.base.ticks = cfg.strategyTicks }
      } else {
        if (e.base.ticks <= 0) {
          const choice = random()
          e.base.strategy = e.boss ? (choice < cfg.furyChance ? 'LoopBack' : 'FindGroup') :
            choice < cfg.fleeChance ? 'Flee' : choice < cfg.furyChance || this.squads.strategy === 'Break' ? 'Fury' : 'LoopBack'
          e.base.ticks = cfg.strategyTicks; e.targetX = playerX; e.targetZ = playerZ
          if (e.base.strategy === 'Fury') {
            const dx = playerX - e.x, dz = playerZ - e.z, d = Math.max(0.001, Math.hypot(dx, dz))
            e.vx = dx / d * e.sheet.summary.SPD * 2; e.vz = dz / d * e.sheet.summary.SPD * 2
          }
        }
        if (!e.boss && e.age > cfg.maxLifeTicks) e.base.strategy = 'Flee'
        if (e.base.strategy === 'Flee' && this.squads.strategy === 'PatrolGrouping' && e.age <= cfg.maxLifeTicks) e.base.strategy = 'FindGroup'
        if (e.base.strategy === 'LoopBack') { tx += Math.sin(e.age / 30) * squad.radius; tz += Math.cos(e.age / 30) * squad.radius }
        if (e.base.strategy === 'Flee') { tx = e.x; tz = BALANCE.world.maxZ + BALANCE.world.despawnMargin + 5 }
        if (e.base.strategy !== 'Fury') {
          let dx = tx - e.x, dz = tz - e.z
          for (const other of this._staged) {
            if (other === e || !other.active) continue
            const sx = e.x - other.x, sz = e.z - other.z, d = Math.hypot(sx, sz)
            if (d > 0 && d < squad.separation) { dx += sx / d * (squad.separation - d); dz += sz / d * (squad.separation - d) }
          }
          const d = Math.max(0.001, Math.hypot(dx, dz)), speed = Math.min(e.sheet.summary.SPD, d * squad.followGain)
          e.vx += (dx / d * speed - e.vx) * Math.min(1, squad.followGain * dt)
          e.vz += (dz / d * speed - e.vz) * Math.min(1, squad.followGain * dt)
        }
        e.x += e.vx * dt; e.z += e.vz * dt
        if (!e.boss && (e.z > BALANCE.world.maxZ + BALANCE.world.despawnMargin || e.x < BALANCE.world.minX - 32 || e.x > BALANCE.world.maxX + 32 || e.z < BALANCE.world.minZ - 32)) { this.retire(e); continue }
        if (e.boss) { e.x = Math.max(BALANCE.world.minX, Math.min(BALANCE.world.maxX, e.x)); e.z = Math.max(BALANCE.world.minZ, Math.min(playerZ - squad.radius, e.z)) }
      }
      const heading = Math.atan2(e.vx, e.vz)
      const delta = Math.atan2(Math.sin(heading - e.rotY), Math.cos(heading - e.rotY))
      e.rotY += Math.max(-cfg.turnSpeed * dt, Math.min(cfg.turnSpeed * dt, delta))
      if (--e.fireTicks <= 0 && e.base.strategy !== 'EnterGate' && Math.hypot(playerX - e.x, playerZ - e.z) < cfg.fireRange) {
        const bolt = this.bolts.find((b) => !b.active)
        if (bolt) {
          const dx = playerX - e.x, dz = playerZ - e.z, d = Math.max(0.001, Math.hypot(dx, dz))
          Object.assign(bolt, { active: true, id: ++this._sequence, x: e.x, z: e.z, previousX: e.x, previousZ: e.z, vx: dx / d * cfg.shotSpeed, vz: dz / d * cfg.shotSpeed, life: cfg.shotLifetime })
        }
        e.fireTicks = cfg.fireTicks
      }
    }
    for (const b of this.bolts) if (b.active) {
      b.previousX = b.x; b.previousZ = b.z; b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt
      if (b.life <= 0 || b.z > BALANCE.world.maxZ + 12 || b.z < BALANCE.world.minZ - 32 || Math.abs(b.x) > BALANCE.world.maxX + 32) b.reset()
    }
  }
  clear(): void { this._pool.releaseAll(); this._staged.length = 0; this.squads.clear(); for (const b of this.bolts) b.reset() }
  dispose(): void { this._disposed = true; this.clear() }
}
