import { BALANCE } from '../core/balancer.ts'
import type { WeaponId } from '../core/player-shot.ts'
import type { GameplayInput } from '../core/run-input.ts'
import type { EnergyManager } from './energy-manager.ts'
import type { CharSheetManager } from './char-sheet-manager.ts'
import type { ShotManager } from './shot-manager.ts'
import type { GameMode } from '../../../shared/rankings.ts'

export interface MuzzlePose { readonly x: number; readonly z: number }
export interface AreaAttack { active: boolean; kind: 'beam' | 'mjolnir' | 'nova'; x: number; z: number; damage: number }
export class FiringManager {
  private readonly _loadout: WeaponId[] = ['laser']
  private readonly _levels: Record<WeaponId, number> = { laser: 1, plasma: 1, beam: 1, mjolnir: 1 }
  private _weaponIndex = 0
  private _cooldown = 0
  private _bombCooldown = 0
  private _fireHeld = false
  private _bombs: number
  readonly areaAttack: AreaAttack = { active: false, kind: 'beam', x: 0, z: 0, damage: 0 }
  constructor(private readonly _input: GameplayInput, private readonly _energy: EnergyManager, private readonly _sheet: CharSheetManager, private readonly _shots: ShotManager, private readonly _mode: GameMode = 'normal') {
    this._bombs = _mode === 'survivor' ? 0 : BALANCE.economy.initialBombs
  }
  get shooting(): boolean { return this._fireHeld }
  get activeWeapon(): WeaponId { return this._loadout[this._weaponIndex] ?? 'laser' }
  get loadout(): readonly WeaponId[] { return this._loadout }
  get level(): number { return this._levels[this.activeWeapon] }
  get bombCharges(): number { return this._bombs }
  get damageMultiplier(): number { return this._sheet.summary.S_D / 10 * (1 + (this.level - 1) * BALANCE.economy.damagePerLevel) }
  unlock(id: string): boolean {
    if (this._mode === 'survivor' || !['laser', 'plasma', 'beam', 'mjolnir'].includes(id) || this._loadout.includes(id as WeaponId)) return false
    this._loadout.push(id as WeaponId)
    this._sheet.full.special.Secondary_Weapon.itemId = id
    return true
  }
  select(id: string): void {
    const index = this._loadout.indexOf(id as WeaponId)
    if (index >= 0) { this._weaponIndex = index; this._cooldown = 0 }
  }
  upgrade(id: WeaponId = this.activeWeapon): void { if (this._mode !== 'survivor') this._levels[id] = Math.min(BALANCE.economy.maxWeaponLevel, this._levels[id] + 1) }
  addBombs(count: number): void { if (this._mode !== 'survivor') this._bombs = Math.min(BALANCE.economy.maxBombs, this._bombs + count) }
  releaseFireHold(): void {
    if (this._fireHeld) this._sheet.shipStatus.setShootingActive(false, BALANCE.player.cooldowns.shootingMs)
    this._fireHeld = false; this.areaAttack.active = false
  }
  updateSim(dt: number, muzzle: MuzzlePose): void {
    this.areaAttack.active = false
    this._cooldown -= dt; this._bombCooldown -= dt
    if (this._mode !== 'survivor' && this._input.wasPressed('X')) {
      this._weaponIndex = (this._weaponIndex + 1) % this._loadout.length; this._cooldown = 0
    }
    if (this._mode !== 'survivor' && this._input.wasPressed('B') && this._bombs > 0 && this._bombCooldown <= 0 && this._energy.spend(BALANCE.economy.bomb.energy)) {
      this._bombs--; this._bombCooldown = BALANCE.economy.bomb.cooldown
      this._sheet.shipStatus.pulseBombing(BALANCE.player.cooldowns.bombingMs)
      Object.assign(this.areaAttack, { active: true, kind: 'nova', x: muzzle.x, z: muzzle.z, damage: BALANCE.economy.bomb.damage })
      return
    }
    const holding = this._input.isDown('A')
    if (holding) this._sheet.shipStatus.setShootingActive(true, BALANCE.player.cooldowns.shootingMs)
    else if (this._fireHeld) this._sheet.shipStatus.setShootingActive(false, BALANCE.player.cooldowns.shootingMs)
    this._fireHeld = holding
    if (!holding || this._cooldown > 0) return
    const weapon = this.activeWeapon
    if (weapon === 'beam' || weapon === 'mjolnir') {
      const profile = BALANCE.economy.profiles[weapon]
      const cost = profile.energy * (weapon === 'beam' ? dt : 1)
      if (!this._energy.spend(cost)) return
      Object.assign(this.areaAttack, { active: true, kind: weapon, x: muzzle.x, z: muzzle.z, damage: profile.damage * this.damageMultiplier * (weapon === 'beam' ? dt * this._sheet.summary.S_R / 8 : 1) })
      if (weapon === 'mjolnir') this._cooldown = 1 / Math.max(0.05, BALANCE.economy.profiles.mjolnir.rate * this._sheet.summary.S_R / 8)
      return
    }
    const profile = weapon === 'laser' ? BALANCE.weapons.laser : BALANCE.economy.profiles.plasma
    const cost = weapon === 'laser' ? BALANCE.weapons.laser.energyPerShot : BALANCE.economy.profiles.plasma.energy
    if (!this._energy.canAfford(cost)) return
    const shot = this._shots.acquire()
    if (!shot) return
    if (!this._energy.spend(cost)) { this._shots.release(shot); return }
    this._cooldown = 1 / Math.max(0.05, profile.rate * this._sheet.summary.S_R / 8)
    shot.activate({ x: muzzle.x, z: muzzle.z + BALANCE.weapons.laser.muzzleOffsetZ, vx: 0, vz: -profile.speed, lifetime: profile.lifetime,
      weapon, damage: profile.damage * this.damageMultiplier, radius: profile.radius, area: weapon === 'plasma' ? BALANCE.economy.profiles.plasma.area : 0 })
  }
}
