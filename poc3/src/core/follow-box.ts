import { BALANCE } from './balancer.ts'
import { clamp, damp } from './math.ts'

const MOVE_EPS = 0.01
const CENTER_EPS = 0.25

interface AxisRef {
  last: number
  anchor: number
}

interface AxisState {
  centering: boolean
  interrupted: boolean
  velocity: number
  delayMs: number
  stillMs: number
}

function newAxisState(): AxisState {
  return {
    centering: false,
    interrupted: false,
    velocity: 0,
    delayMs: 0,
    stillMs: 0,
  }
}

function edgeTarget(value: number, centre: number, half: number): number {
  if (value - centre > half) {
    return value - half
  }
  if (value - centre < -half) {
    return value + half
  }
  return centre
}

function settleRate(ms: number): number {
  return ms <= 0 ? Number.POSITIVE_INFINITY : -Math.log(0.02) / (ms / 1000)
}

function updateAxis(
  ref: AxisRef,
  ship: number,
  half: number,
  restOffset: number,
  state: AxisState,
  dt: number,
): void {
  const zone = BALANCE.followBox
  const moving = Math.abs(ship - ref.last) > MOVE_EPS
  ref.last = ship

  const rate = settleRate(zone.bounce.timeMs)
  if (!state.centering) {
    ref.anchor = damp(ref.anchor, edgeTarget(ship, ref.anchor, half), rate, dt)
  }

  const rest = ship - restOffset
  const err = rest - ref.anchor
  const off = Math.abs(err)

  if (state.centering) {
    if (moving) {
      state.centering = false
      state.interrupted = true
      state.stillMs = 0
      state.velocity = 0
    } else {
      state.velocity += Math.sign(err) * zone.recenter.accel * dt
      const maxSafe = Math.min(zone.recenter.maxSpeed, off * 5)
      state.velocity = clamp(state.velocity, -maxSafe, maxSafe)
      ref.anchor += state.velocity * dt
      if (off < CENTER_EPS) {
        state.centering = false
        state.velocity = 0
        state.delayMs = 0
      }
    }
  } else if (state.interrupted) {
    state.stillMs += dt * 1000
    if (moving) {
      state.stillMs = 0
    }
    if (state.stillMs >= zone.recenter.stillMs) {
      state.interrupted = false
      state.delayMs = 0
    }
  }

  if (!state.centering && !state.interrupted && off > CENTER_EPS) {
    state.delayMs += dt * 1000
    if (moving) {
      state.delayMs = 0
    }
    if (state.delayMs >= zone.recenter.delayMs) {
      state.centering = true
      state.velocity = 0
      state.delayMs = 0
    }
  } else {
    state.delayMs = 0
  }
}

/** POC2 LimitBox follow math — Core only, no Three.js. */
export class FollowBoxSim {
  private readonly _axisX: AxisRef
  private readonly _axisZ: AxisRef
  private readonly _stateX: AxisState
  private readonly _stateZ: AxisState
  private _camX: number
  private _camZ: number

  constructor() {
    const anchor = BALANCE.followBox.anchor
    this._axisX = { last: anchor.x, anchor: anchor.x }
    this._axisZ = { last: anchor.z, anchor: anchor.z }
    this._stateX = newAxisState()
    this._stateZ = newAxisState()
    this._camX = BALANCE.camera.position.x
    this._camZ = BALANCE.camera.position.z
  }

  get cameraX(): number {
    return this._camX
  }

  get cameraZ(): number {
    return this._camZ
  }

  update(shipX: number, shipZ: number, dt: number): void {
    const box = BALANCE.followBox
    const axStart = this._axisX.anchor
    const azStart = this._axisZ.anchor
    updateAxis(
      this._axisX,
      shipX,
      box.halfX,
      box.restLine.position.x,
      this._stateX,
      dt,
    )
    updateAxis(
      this._axisZ,
      shipZ,
      box.halfZ,
      box.restLine.position.z + box.halfZ,
      this._stateZ,
      dt,
    )
    this._camX += this._axisX.anchor - axStart
    this._camZ += this._axisZ.anchor - azStart
  }
}
