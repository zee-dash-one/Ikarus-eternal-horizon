import { BALANCE } from '../core/balancer.ts'
import type { DomainEvent, EventBus } from '../core/event.ts'
import type { MaterialId } from '../core/run-economy.ts'
import type { RunInventory } from './run-inventory.ts'

export class DropEntity {
  id = 0; active = false; material: MaterialId = 'metalScrap'; amount = 0; x = 0; z = 0; remaining = 0
}
/** Pure pooled simulation. Inventory overflow leaves the unaccepted amount on the field. */
export class DropManager {
  readonly entities = Array.from({ length: BALANCE.economy.drops.budget }, () => new DropEntity())
  omitted = 0
  private _sequence = 0
  constructor(private readonly _inventory?: RunInventory, private readonly _random: () => number = () => 0.5) {}
  onSourceKilled(event: Extract<DomainEvent, { type: 'drop_requested' }>): void {
    const cfg = BALANCE.economy.drops
    if (event.source === 'meteor' || this._random() < cfg.enemyChance) this.spawn('metalScrap', event.source === 'meteor' ? cfg.meteorScrap : cfg.scrapMin + Math.floor(this._random() * (cfg.scrapMax - cfg.scrapMin + 1)), event.x, event.z)
    if (event.rank === 'miniboss') {
      this.spawn('prismaticCrystal', cfg.bossCrystal, event.x, event.z)
      this.spawn('denseCore', cfg.bossCore, event.x, event.z)
    } else if (this._random() < cfg.crystalChance) this.spawn('prismaticCrystal', 1, event.x, event.z)
  }
  spawn(material: MaterialId, amount: number, x: number, z: number): boolean {
    const drop = this.entities.find((row) => !row.active)
    if (!drop) { this.omitted++; return false }
    Object.assign(drop, { id: ++this._sequence, active: true, material, amount, x, z, remaining: BALANCE.economy.drops.lifetime })
    return true
  }
  updateSim(dt = 0, playerX = 0, playerZ = 0, events?: EventBus): void {
    const cfg = BALANCE.economy.drops, world = BALANCE.world
    for (const drop of this.entities) {
      if (!drop.active || dt <= 0) continue
      drop.remaining -= dt
      const dx = playerX - drop.x, dz = playerZ - drop.z, distance = Math.hypot(dx, dz)
      if (distance <= cfg.collectRadius && this._inventory) {
        const accepted = this._inventory.tryAdd(drop.material, drop.amount)
        drop.amount -= accepted
        if (accepted) events?.publish({ type: 'sound_cue', cue: 'collect' })
        if (!drop.amount) { drop.active = false; continue }
      }
      if (distance > cfg.collectRadius && distance <= cfg.magnetRadius) {
        const step = Math.min(cfg.magnetSpeed * dt, distance)
        drop.x += dx / distance * step; drop.z += dz / distance * step
      } else drop.z += cfg.drift * dt
      if (drop.remaining <= 0 || drop.z > world.maxZ + world.despawnMargin) drop.active = false
    }
  }
  dispose(): void { for (const drop of this.entities) drop.active = false }
}
