import { BALANCE } from '../core/balancer.ts'
import { clamp, lerp, moveToward } from '../core/math.ts'
import { integritySpeedMultiplier } from '../core/sheet/char-sheet.ts'
import type { PlayerPose } from '../core/world-snapshot.ts'
import type { InputManager } from './input-manager.ts'
import type { CharSheetManager } from './char-sheet-manager.ts'
import type { EnergyManager } from './energy-manager.ts'

export class PlayerManager {
  private readonly _input: InputManager
  private readonly _sheet: CharSheetManager
  private readonly _energy: EnergyManager
  private _vx = 0
  private _vz = 0
  private _bank = 0
  private _dashTicks = 0
  private _dashCooldown = 0
  private _dashing = false
  private _pose = { x: 0, y: 0, z: 0, rotY: 0, bank: 0, dashing: false }

  constructor(input: InputManager, sheet: CharSheetManager, energy: EnergyManager) {
    this._input = input
    this._sheet = sheet
    this._energy = energy
  }

  get pose(): PlayerPose {
    return this._pose
  }

  updateSim(dt: number): void {
    const summary = this._sheet.summary
    if (summary.integrityState === 'DEAD') {
      return
    }

    if (this._dashCooldown > 0) {
      this._dashCooldown -= 1
    }
    if (this._dashTicks > 0) {
      this._dashTicks -= 1
      if (this._dashTicks === 0) {
        this._dashing = false
        this._sheet.setContext('dashing', false)
      }
    }

    const moveX = this._input.axis('moveX')
    const moveZ = this._input.axis('moveZ')

    if (this._input.wasPressed('R1') && this._dashCooldown === 0 && !this._dashing) {
      const cost = BALANCE.player.dash.energyCost
      if (this._energy.spend(cost)) {
        this._dashing = true
        this._dashTicks = BALANCE.player.dash.durationTicks
        this._dashCooldown = BALANCE.player.dash.cooldownTicks
        this._sheet.setContext('dashing', true)
        const len = Math.hypot(moveX, moveZ) || 1
        this._vx += (moveX / len) * BALANCE.player.dash.impulse
        this._vz += (moveZ / len) * BALANCE.player.dash.impulse
      }
    }

    const integrityMul = integritySpeedMultiplier(summary.integrityState)
    const maxSpeed =
      summary.SPD * BALANCE.player.motion.maxSpeedScale * integrityMul

    const targetVx = moveX * maxSpeed
    const targetVz = moveZ * maxSpeed
    const accel = BALANCE.player.motion.accel
    const decel = BALANCE.player.motion.decel

    this._vx = moveToward(
      this._vx,
      targetVx,
      (moveX !== 0 ? accel : decel) * dt,
    )
    this._vz = moveToward(
      this._vz,
      targetVz,
      (moveZ !== 0 ? accel : decel) * dt,
    )

    this._pose.x += this._vx * dt
    this._pose.z += this._vz * dt

    const w = BALANCE.world
    this._pose.x = clamp(this._pose.x, w.minX, w.maxX)
    this._pose.z = clamp(this._pose.z, w.minZ, w.maxZ)

    const targetBank =
      -moveX * BALANCE.player.motion.bankMaxDeg * (Math.PI / 180)
    const bankSpeed =
      (targetBank !== 0
        ? BALANCE.player.motion.bankRiseMs
        : BALANCE.player.motion.bankFallMs) / 1000
    this._bank = lerp(this._bank, targetBank, clamp(dt / bankSpeed, 0, 1))
    this._pose.bank = this._bank
    this._pose.rotY = Math.atan2(this._vx, -this._vz)
    this._pose.dashing = this._dashing
  }
}
