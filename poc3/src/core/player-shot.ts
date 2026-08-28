export interface ShotSpawn {
  readonly x: number
  readonly z: number
  readonly vx: number
  readonly vz: number
  readonly lifetime: number
}

export type WeaponId = 'laser'

/** Core sim state for one pooled player bolt. */
export class PlayerShot {
  active = false
  x = 0
  z = 0
  vx = 0
  vz = 0
  lifetime = 0

  activate(spawn: ShotSpawn): void {
    this.active = true
    this.x = spawn.x
    this.z = spawn.z
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
    this.x += this.vx * dt
    this.z += this.vz * dt
    this.lifetime -= dt
    if (this.lifetime <= 0) {
      this.reset()
    }
  }
}
