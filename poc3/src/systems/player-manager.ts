import { BALANCE } from '../core/balancer.ts'
import { clamp } from '../core/math.ts'
import type { PlayerPose } from '../core/world-snapshot.ts'
import type { GameplayInput } from '../core/run-input.ts'
import type { CharSheetManager } from './char-sheet-manager.ts'
import type { EnergyManager } from './energy-manager.ts'

function pushVelocity(
  velocity: number,
  direction: number,
  force: number,
  maxSpeed: number,
  dt: number,
): number {
  const next = velocity + direction * force * dt
  const capped = Math.min(Math.abs(next), maxSpeed)
  return next === 0 ? 0 : Math.sign(next) * capped
}

function coastToZero(velocity: number, rate: number, dt: number): number {
  const step = rate * dt
  if (velocity > 0) {
    return Math.max(0, velocity - step)
  }
  if (velocity < 0) {
    return Math.min(0, velocity + step)
  }
  return 0
}

function axisVelocity(
  velocity: number,
  direction: number,
  accel: number,
  brake: number,
  decel: number,
  maxSpeed: number,
  dt: number,
): number {
  if (direction === 0) {
    return coastToZero(velocity, decel, dt)
  }
  const sign = direction < 0 ? -1 : 1
  const mag = Math.abs(direction)
  const braking = velocity !== 0 && Math.sign(velocity) !== sign
  const force = (braking ? brake : accel) * mag
  return pushVelocity(velocity, sign, force, maxSpeed, dt)
}

function wrapDeg(value: number): number {
  let next = value
  while (next > 180) {
    next -= 360
  }
  while (next < -180) {
    next += 360
  }
  return next
}

/** POC2 PlayerController motion port — Core sim only. */
export class PlayerManager {
  private readonly _input: GameplayInput
  private readonly _sheet: CharSheetManager
  private readonly _energy: EnergyManager
  private _vx = 0
  private _vz = 0
  private _tiltCur = 0
  private _dashMs = 0
  private _rollMs = 0
  private _rollDurMs = 0
  private _rollFrom = 0
  private _rollDelta = 0
  private _dashing = false
  private _pose = { x: 0, y: 0, z: 0, rotY: 0, bank: 0, dashing: false }

  constructor(input: GameplayInput, sheet: CharSheetManager, energy: EnergyManager) {
    this._input = input
    this._sheet = sheet
    this._energy = energy
  }

  get pose(): PlayerPose {
    return this._pose
  }

  get dashing(): boolean {
    return this._dashing
  }

  setEntryProgress(progress: number, fromZ: number): void {
    this._pose.z = fromZ * Math.pow(1 - Math.max(0, Math.min(1, progress)), 3)
  }

  updateSim(dt: number): void {
    const summary = this._sheet.summary
    if (summary.integrityState === 'DEAD') {
      return
    }

    if (this._dashMs > 0) {
      this._dashMs = Math.max(0, this._dashMs - dt * 1000)
      if (this._dashMs === 0) {
        this._endDash()
      }
    } else if (this._dashing) {
      this._endDash()
    }

    const moveX = this._input.axis('moveX')
    const moveZ = this._input.axis('moveZ')
    const motion = BALANCE.player.motion
    const tilt = BALANCE.player.tilt
    const dash = BALANCE.player.dash
    const accel = motion.accel
    let maxSpeed = summary.SPD

    if (this._input.wasPressed('R1') && !this._dashing) {
      if (
        this._energy.canAfford(dash.energyCost) &&
        this._snapDash(moveX, moveZ, maxSpeed, dash)
      ) {
        this._energy.spend(dash.energyCost)
        this._dashing = true
        this._sheet.setContext('dashing', true)
        this._sheet.shipStatus.setDashingActive(true, BALANCE.player.cooldowns.dashingMs)
      }
    }

    if (this._dashMs > 0) {
      maxSpeed *= dash.speedMul
    }

    this._vx = axisVelocity(
      this._vx,
      moveX,
      accel,
      motion.brake,
      motion.decel,
      maxSpeed,
      dt,
    )
    this._vz = axisVelocity(
      this._vz,
      moveZ,
      accel,
      motion.brake,
      motion.decel,
      maxSpeed,
      dt,
    )

    this._pose.x += this._vx * dt
    this._pose.z += this._vz * dt

    const w = BALANCE.world
    this._pose.x = clamp(this._pose.x, w.minX, w.maxX)
    this._pose.z = clamp(this._pose.z, w.minZ, w.maxZ)

    this._updateBank(moveX, dt, tilt)
    this._pose.dashing = this._dashing
  }

  private _endDash(): void {
    this._dashing = false
    this._sheet.setContext('dashing', false)
    this._sheet.shipStatus.setDashingActive(false, BALANCE.player.cooldowns.dashingMs)
  }

  private _snapDash(
    dirX: number,
    dirZ: number,
    maxSpeed: number,
    dash: { readonly speedMul: number; readonly durationMs: number },
  ): boolean {
    const dirLen = Math.hypot(dirX, dirZ)
    let dx: number
    let dz: number
    if (dirLen > 0) {
      dx = dirX / dirLen
      dz = dirZ / dirLen
    } else {
      const vLen = Math.hypot(this._vx, this._vz)
      if (vLen <= 0) {
        return false
      }
      dx = this._vx / vLen
      dz = this._vz / vLen
    }
    const cap = maxSpeed * dash.speedMul
    this._vx = dx * cap
    this._vz = dz * cap
    this._dashMs = dash.durationMs
    const tilt = BALANCE.player.tilt
    if (Math.abs(dx) > 0.001) {
      this._rollFrom = this._tiltCur
      this._rollDelta = 360 * Math.sign(dx) * tilt.sign
      this._rollMs = 0
      this._rollDurMs = dash.durationMs
    }
    return true
  }

  private _updateBank(
    dirX: number,
    dt: number,
    tilt: {
      readonly sign: 1 | -1
      readonly maxDeg: number
      readonly riseMs: number
      readonly fallMs: number
    },
  ): void {
    if (this._rollDurMs > 0) {
      this._rollMs += dt * 1000
      const t = Math.min(1, this._rollMs / this._rollDurMs)
      this._tiltCur = this._rollFrom + this._rollDelta * t
      if (t >= 1) {
        this._rollDurMs = 0
        this._tiltCur = wrapDeg(this._tiltCur)
      }
    } else {
      const targetTilt = dirX * tilt.maxDeg * tilt.sign
      const useFall = Math.abs(targetTilt) < Math.abs(this._tiltCur)
      const tiltMs = useFall ? tilt.fallMs : tilt.riseMs
      const tiltRate = tilt.maxDeg / (tiltMs / 1000)
      const step = tiltRate * dt
      if (targetTilt > this._tiltCur) {
        this._tiltCur = Math.min(targetTilt, this._tiltCur + step)
      } else {
        this._tiltCur = Math.max(targetTilt, this._tiltCur - step)
      }
    }
    this._pose.bank = this._tiltCur
    this._pose.rotY = 0
  }
}
