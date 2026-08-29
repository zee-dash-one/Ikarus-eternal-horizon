import { BALANCE } from '../../core/balancer.ts'
import { clampMouseSteerSensitivity } from '../../core/input-bindings.ts'

export interface MouseSteerHoldState {
  holdX: -1 | 0 | 1
  holdZ: -1 | 0 | 1
  lastImpulseX: number
  lastImpulseZ: number
}

export function createMouseSteerHoldState(): MouseSteerHoldState {
  return {
    holdX: 0,
    holdZ: 0,
    lastImpulseX: 0,
    lastImpulseZ: 0,
  }
}

/** Pixels per mousemove needed to register a steer hold (lower = more sensitive). */
export function mouseHoldThresholdPx(userSensitivity: number): number {
  const mul = clampMouseSteerSensitivity(userSensitivity)
  return BALANCE.controls.mouse.moveHoldThresholdBase / mul
}

export function applyMouseSteerImpulse(
  state: MouseSteerHoldState,
  movementX: number,
  movementY: number,
  thresholdPx: number,
  nowMs: number,
): void {
  if (thresholdPx <= 0) {
    return
  }
  if (Math.abs(movementX) >= thresholdPx) {
    state.holdX = movementX > 0 ? 1 : -1
    state.lastImpulseX = nowMs
  }
  if (Math.abs(movementY) >= thresholdPx) {
    state.holdZ = movementY > 0 ? 1 : -1
    state.lastImpulseZ = nowMs
  }
}

export function tickMouseSteerHold(
  state: MouseSteerHoldState,
  graceMs: number,
  nowMs: number,
): void {
  if (state.lastImpulseX > 0 && nowMs - state.lastImpulseX > graceMs) {
    state.holdX = 0
  }
  if (state.lastImpulseZ > 0 && nowMs - state.lastImpulseZ > graceMs) {
    state.holdZ = 0
  }
}

export function resetMouseSteerHold(state: MouseSteerHoldState): void {
  state.holdX = 0
  state.holdZ = 0
  state.lastImpulseX = 0
  state.lastImpulseZ = 0
}
