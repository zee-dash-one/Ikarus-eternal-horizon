import { describe, expect, it } from 'vitest'
import {
  applyMouseSteerImpulse,
  createMouseSteerHoldState,
  tickMouseSteerHold,
} from './mouse-steer-hold.ts'

describe('mouse steer hold', () => {
  it('registers hold when movement exceeds threshold', () => {
    const state = createMouseSteerHoldState()
    applyMouseSteerImpulse(state, 12, -10, 8, 1000)
    expect(state.holdX).toBe(1)
    expect(state.holdZ).toBe(-1)
    expect(state.lastImpulseX).toBe(1000)
    expect(state.lastImpulseZ).toBe(1000)
  })

  it('ignores movement below threshold', () => {
    const state = createMouseSteerHoldState()
    applyMouseSteerImpulse(state, 2, -3, 8, 1000)
    expect(state.holdX).toBe(0)
    expect(state.holdZ).toBe(0)
  })

  it('releases hold after grace period without qualifying movement', () => {
    const state = createMouseSteerHoldState()
    applyMouseSteerImpulse(state, 20, 0, 8, 1000)
    tickMouseSteerHold(state, 500, 1600)
    expect(state.holdX).toBe(0)
  })

  it('keeps hold while impulses arrive within grace window', () => {
    const state = createMouseSteerHoldState()
    applyMouseSteerImpulse(state, 20, 0, 8, 1000)
    tickMouseSteerHold(state, 500, 1300)
    expect(state.holdX).toBe(1)
    applyMouseSteerImpulse(state, 20, 0, 8, 1400)
    tickMouseSteerHold(state, 500, 1800)
    expect(state.holdX).toBe(1)
  })
})
