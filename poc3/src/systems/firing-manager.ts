import { BALANCE } from '../core/balancer.ts'
import type { WeaponId } from '../core/player-shot.ts'
import type { InputManager } from './input-manager.ts'
import type { EnergyManager } from './energy-manager.ts'
import type { CharSheetManager } from './char-sheet-manager.ts'
import type { ShotManager } from './shot-manager.ts'

export interface MuzzlePose {
  readonly x: number
  readonly z: number
}

/** Virtual pad → laser fire / weapon switch (POC2 FiringManager port). */
export class FiringManager {
  private readonly _input: InputManager
  private readonly _energy: EnergyManager
  private readonly _sheet: CharSheetManager
  private readonly _shots: ShotManager
  private readonly _loadout: readonly WeaponId[]
  private _weaponIndex = 0
  private _cooldown = 0
  private _switchHeld = false
  private _fireHeld = false

  constructor(
    input: InputManager,
    energy: EnergyManager,
    sheet: CharSheetManager,
    shots: ShotManager,
  ) {
    this._input = input
    this._energy = energy
    this._sheet = sheet
    this._shots = shots
    this._loadout = BALANCE.weapons.loadout as readonly WeaponId[]
  }

  get shooting(): boolean {
    return this._fireHeld
  }

  get activeWeapon(): WeaponId {
    return this._loadout[this._weaponIndex] ?? 'laser'
  }

  updateSim(dt: number, muzzle: MuzzlePose): void {
    const switchDown = this._input.isDown('X')
    if (switchDown && !this._switchHeld) {
      this._cycleWeapon()
    }
    this._switchHeld = switchDown

    void this._input.wasPressed('Y')

    const cd = BALANCE.player.cooldowns
    if (this._input.wasPressed('B')) {
      this._sheet.shipStatus.pulseBombing(cd.bombingMs)
    }

    this._cooldown -= dt
    const holding = this._input.isDown('A')
    if (holding) {
      this._sheet.shipStatus.setShootingActive(true, cd.shootingMs)
    } else if (this._fireHeld) {
      this._sheet.shipStatus.setShootingActive(false, cd.shootingMs)
    }
    this._fireHeld = holding

    if (!holding || this._cooldown > 0) {
      return
    }

    if (this.activeWeapon === 'laser') {
      this._fireLaser(dt, muzzle)
    }
  }

  private _cycleWeapon(): void {
    if (this._loadout.length <= 1) {
      return
    }
    this._weaponIndex = (this._weaponIndex + 1) % this._loadout.length
  }

  private _fireLaser(_dt: number, muzzle: MuzzlePose): void {
    const laser = BALANCE.weapons.laser
    const summary = this._sheet.summary
    if (!this._energy.canAfford(laser.energyPerShot)) {
      return
    }
    const shot = this._shots.acquire()
    if (!shot) {
      return
    }
    if (!this._energy.spend(laser.energyPerShot)) {
      this._shots.release(shot)
      return
    }

    const rate = Math.max(0.05, laser.rate * (summary.S_R / 8))
    this._cooldown = 1 / rate

    shot.activate({
      x: muzzle.x,
      z: muzzle.z + laser.muzzleOffsetZ,
      vx: 0,
      vz: -laser.speed,
      lifetime: laser.lifetime,
    })
  }
}
