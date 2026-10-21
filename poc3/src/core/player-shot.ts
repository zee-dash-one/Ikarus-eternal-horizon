import { BALANCE } from './balancer.ts'

export interface ShotSpawn {
  readonly damage?: number
  readonly radius?: number
  readonly weapon?: WeaponId
  readonly area?: number
  readonly x: number
  readonly z: number
  readonly vx: number
  readonly vz: number
  readonly lifetime: number
}

export type WeaponId = 'laser' | 'plasma' | 'beam' | 'mjolnir'

/** Core sim state for one pooled player bolt. */
export class PlayerShot {
  id = 0
  active = false
  x = 0
  z = 0
  previousX = 0
  previousZ = 0
  vx = 0
  vz = 0
  lifetime = 0
  damage = 0
  radius = 0
  weapon: WeaponId = 'laser'
  area = 0

  activate(spawn: ShotSpawn): void {
    this.damage = spawn.damage ?? BALANCE.weapons.laser.damage
    this.radius = spawn.radius ?? BALANCE.weapons.laser.radius
    this.weapon = spawn.weapon ?? 'laser'
    this.area = spawn.area ?? 0
    this.active = true
    this.x = spawn.x
    this.z = spawn.z
    this.previousX = spawn.x
    this.previousZ = spawn.z
    this.vx = spawn.vx
    this.vz = spawn.vz
    this.lifetime = spawn.lifetime
  }

  reset(): void {
    this.active = false
    this.x = 0
    this.z = 0
    this.vx = 0
    this.vz = 0
    this.lifetime = 0
  }

  updateSim(dt: number): void {
    if (!this.active) {
      return
    }
    this.previousX = this.x
    this.previousZ = this.z
    this.x += this.vx * dt
    this.z += this.vz * dt
    this.lifetime -= dt
    if (this.lifetime <= 0) {
      this.active = false
    }
  }
}
