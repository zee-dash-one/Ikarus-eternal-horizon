import { BALANCE } from '../core/balancer.ts'
import type { RunContext } from './run-context.ts'
import type { PlayerShot } from '../core/player-shot.ts'
import { DamageManager } from './damage-manager.ts'

/** Relative swept-circle hit test (both bodies may move in the fixed step). */
export function sweepTime(ax: number, az: number, bx: number, bz: number, px: number, pz: number, qx: number, qz: number, radius: number): number | null {
  const x = ax - px, z = az - pz, dx = bx - ax - qx + px, dz = bz - az - qz + pz
  const c = x * x + z * z - radius * radius
  if (c <= 0) return 0
  const a = dx * dx + dz * dz, b = 2 * (x * dx + z * dz), disc = b * b - 4 * a * c
  if (a === 0 || disc < 0) return null
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return t >= 0 && t <= 1 ? t : null
}

export class CombatManager {
  private _grace = 0
  private readonly _damage: DamageManager
  constructor(private readonly _ctx: RunContext) { this._damage = new DamageManager(_ctx.events) }
  explode(shot: PlayerShot): void {
    if (shot.area > 0) this._area(shot.x, shot.z, shot.area, shot.damage)
  }
  private _area(x: number, z: number, radius: number, damage: number): void {
    const ctx = this._ctx, world = ctx.prepared
    if (!world) return
    for (let i = world.enemies.staged.length - 1; i >= 0; i--) {
      const e = world.enemies.staged[i]
      if (e?.active && Math.hypot(e.x - x, e.z - z) <= radius + e.radius) world.enemies.hit(e, damage, ctx.events)
    }
    for (let i = world.meteors.staged.length - 1; i >= 0; i--) {
      const m = world.meteors.staged[i]
      if (m?.active && Math.hypot(m.x - x, m.z - z) <= radius + m.radius) world.meteors.hit(m, damage, ctx.events)
    }
  }
  resolve(previousPlayerX: number, previousPlayerZ: number): void {
    const ctx = this._ctx, world = ctx.prepared
    if (!world) return
    const { enemies, meteors } = world, cfg = BALANCE.combat, player = ctx.player.pose
    // A bolt is consumed by the nearest swept impact, including asteroid occlusion.
    for (let i = ctx.shots.activeShots.length - 1; i >= 0; i--) {
      const shot = ctx.shots.activeShots[i]; if (!shot) continue
      let nearest = Infinity, enemy: typeof enemies.staged[number] | null = null, meteor: typeof meteors.staged[number] | null = null
      for (const e of enemies.staged) if (e.collidable) {
        const t = sweepTime(shot.previousX, shot.previousZ, shot.x, shot.z, e.previousX, e.previousZ, e.x, e.z, e.radius + shot.radius)
        if (t !== null && t < nearest) { nearest = t; enemy = e; meteor = null }
      }
      for (const m of meteors.staged) if (m.collidable) {
        const t = sweepTime(shot.previousX, shot.previousZ, shot.x, shot.z, m.previousX, m.previousZ, m.x, m.z, m.radius + shot.radius)
        if (t !== null && t < nearest) { nearest = t; meteor = m; enemy = null }
      }
      if ((enemy || meteor) && shot.area > 0) {
        const impactX = shot.previousX + (shot.x - shot.previousX) * nearest
        const impactZ = shot.previousZ + (shot.z - shot.previousZ) * nearest
        this._area(impactX, impactZ, shot.area, shot.damage)
      } else {
        if (enemy) enemies.hit(enemy, shot.damage, ctx.events)
        if (meteor) meteors.hit(meteor, shot.damage, ctx.events)
      }
      if (enemy || meteor) ctx.shots.release(shot)
    }
    const attack = ctx.firing.areaAttack
    if (attack.active) {
      if (attack.kind === 'nova') {
        this._area(attack.x, attack.z, BALANCE.economy.bomb.radius, attack.damage)
        for (const bolt of enemies.bolts) if (Math.hypot(bolt.x - attack.x, bolt.z - attack.z) <= BALANCE.economy.bomb.radius) bolt.reset()
      } else {
        const hits = (x: number, z: number, radius: number) => {
          const dx = x - attack.x, dz = attack.z - z
          return attack.kind === 'beam'
            ? dz >= 0 && dz <= BALANCE.economy.profiles.beam.range && Math.abs(dx) <= BALANCE.economy.profiles.beam.width + radius
            : dz >= 0 && Math.hypot(dx, dz) <= BALANCE.economy.profiles.mjolnir.range + radius && Math.abs(Math.atan2(dx, dz)) <= BALANCE.economy.profiles.mjolnir.halfAngle
        }
        for (let i = enemies.staged.length - 1; i >= 0; i--) {
          const e = enemies.staged[i]; if (e?.active && hits(e.x, e.z, e.radius)) enemies.hit(e, attack.damage, ctx.events)
        }
        for (let i = meteors.staged.length - 1; i >= 0; i--) {
          const m = meteors.staged[i]; if (m?.active && hits(m.x, m.z, m.radius)) meteors.hit(m, attack.damage, ctx.events)
        }
      }
    }
    if (this._grace > 0) this._grace--
    const touches = (e: { previousX: number; previousZ: number; x: number; z: number }, radius: number) =>
      sweepTime(e.previousX, e.previousZ, e.x, e.z, previousPlayerX, previousPlayerZ, player.x, player.z, radius + cfg.playerRadius) !== null
    const hurt = (amount: number) => {
      if (this._grace || player.dashing) return
      this._damage.applyDamage({ target: ctx.sheet, rawDamage: amount }); this._grace = cfg.contactGraceTicks
    }
    for (const bolt of enemies.bolts) if (bolt.active && touches(bolt, cfg.enemy.shotRadius)) { hurt(cfg.enemy.shotDamage); bolt.reset() }
    for (let i = meteors.staged.length - 1; i >= 0; i--) {
      const m = meteors.staged[i]
      if (m?.collidable && m.spawn && touches(m, m.radius)) { hurt(cfg.meteor.contact[m.spawn.size]); meteors.retire(m) }
    }
    for (const e of enemies.staged) if (e.collidable && touches(e, e.radius)) hurt(cfg.enemy.contactDamage)
  }
}
