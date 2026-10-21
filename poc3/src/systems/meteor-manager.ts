import { BALANCE } from '../core/balancer.ts'
import type { AsteroidSpawnEvent } from '../core/run-plan.ts'
import type { EventBus } from '../core/event.ts'
import { requirePreparation } from '../core/seeded-random.ts'
import { ObjectPool } from '../pools/object-pool.ts'
import type { SpawnPointManager } from './spawn-point-manager.ts'
import { DamageManager } from './damage-manager.ts'

export class MeteorEntity {
  spawn: AsteroidSpawnEvent | null = null
  active = false; collidable = false; x = 0; z = 0; previousX = 0; previousZ = 0; hp = 0; radius = 0
  reset(): void { this.spawn = null; this.active = false; this.collidable = false }
}
/** Consumes authored events only. Optional pool misses are counted and never retried. */
export class MeteorManager {
  private readonly _pool: ObjectPool<MeteorEntity>
  private readonly _staged: MeteorEntity[] = []
  private _disposed = false
  private readonly _damage = new DamageManager()
  omitted = 0
  constructor(budget = BALANCE.preparation.asteroid.budget, prewarm = BALANCE.preparation.asteroid.firstBatch) {
    requirePreparation(Number.isSafeInteger(budget) && budget > 0 && Number.isSafeInteger(prewarm) && prewarm >= 0 && prewarm <= budget, 'pool de asteroides inválido')
    this._pool = new ObjectPool(() => new MeteorEntity(), budget, budget)
  }
  get staged(): readonly MeteorEntity[] { return this._staged }
  get reservedCount(): number { return this._pool.activeCount }
  get activeCount(): number { let count = 0; for (const m of this._staged) if (m.active) count++; return count }
  stage(events: readonly AsteroidSpawnEvent[], spawns: SpawnPointManager): void {
    requirePreparation(!this._disposed && !this._staged.length, 'reserva de asteroides indisponível')
    const counts = new Map<string, number>()
    try {
      for (const descriptor of events) {
        const point = spawns.asteroid(descriptor.spawnPointId), count = (counts.get(point.id) ?? 0) + 1
        requirePreparation(count <= point.capacity, 'lote excede capacidade do spawn'); counts.set(point.id, count)
        const meteor = this._pool.acquire(); requirePreparation(meteor, 'lote excede pool de asteroides')
        meteor.spawn = descriptor; this._staged.push(meteor)
      }
    } catch (error) { this.clear(); throw error }
  }
  emit(spawn: AsteroidSpawnEvent): boolean {
    if (this._disposed) return false
    let m = this._staged.find((e) => e.spawn?.id === spawn.id && !e.active)
    if (!m) { m = this._pool.acquire() ?? undefined; if (!m) { this.omitted++; return false }; this._staged.push(m) }
    m.spawn = spawn; m.active = m.collidable = true; m.x = m.previousX = spawn.position.x; m.z = m.previousZ = spawn.position.z
    m.hp = BALANCE.combat.meteor.hp[spawn.size]; m.radius = BALANCE.preparation.visuals.asteroidRadii[spawn.size]
    return true
  }
  hit(m: MeteorEntity, amount: number, events: EventBus): void {
    if (!m.active || !m.spawn) return
    if (!this._damage.applyMeteorDamage(m, amount)) return
    events.publish({ type: 'meteor_destroyed', eventId: m.spawn.id, size: m.spawn.size, creditedToPlayer: true })
    events.publish({ type: 'drop_requested', source: 'meteor', sourceId: m.spawn.id, x: m.x, z: m.z })
    this.retire(m)
  }
  retire(m: MeteorEntity): void { const i = this._staged.indexOf(m); if (i >= 0) { this._staged.splice(i, 1); this._pool.release(m) } }
  updateSim(dt = 0): void {
    if (!dt || this._disposed) return
    const w = BALANCE.world, margin = Math.max(w.despawnMargin, BALANCE.preparation.spawnMargin)
    for (let i = this._staged.length - 1; i >= 0; i--) {
      const m = this._staged[i]; if (!m?.active || !m.spawn) continue
      m.previousX = m.x; m.previousZ = m.z; m.x += m.spawn.velocity.x * dt; m.z += m.spawn.velocity.z * dt
      if (m.x < w.minX - margin || m.x > w.maxX + margin || m.z < w.minZ - margin || m.z > w.maxZ + w.despawnMargin) this.retire(m)
    }
  }
  clear(): void { this._pool.releaseAll(); this._staged.length = 0 }
  dispose(): void { this._disposed = true; this.clear() }
}
