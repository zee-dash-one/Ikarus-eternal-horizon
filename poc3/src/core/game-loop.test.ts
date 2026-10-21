import { describe, it, expect } from 'vitest'
import { GameLoop, SIM_DT, MAX_STEPS_PER_FRAME, MAX_FRAME_DT } from './game-loop.ts'
import type { FrameClock } from './game-loop.ts'

function frameClock() {
  let now = 0
  let next: ((time: number) => void) | null = null
  const clock: FrameClock = { now: () => now, request: (cb) => { next = cb; return 1 }, cancel: () => { next = null } }
  return { clock, frame: (elapsedMs: number) => { now += elapsedMs; const cb = next; next = null; cb?.(now) } }
}

describe('GameLoop', () => {
  it('SIM_DT is 1/60', () => {
    expect(SIM_DT).toBeCloseTo(1 / 60)
  })

  it('stepSim advances when not paused', () => {
    let steps = 0
    const loop = new GameLoop({
      step: () => {
        steps += 1
      },
    })
    loop.stepSim()
    expect(steps).toBe(1)
  })

  it('pause gate stops Core ticks', () => {
    let steps = 0
    const loop = new GameLoop({
      step: () => {
        steps += 1
      },
    })
    loop.pause()
    loop.stepSim()
    expect(steps).toBe(0)
  })
  it('caps a long inactive gap and never repays the dropped backlog', () => {
    const clock = frameClock()
    let steps = 0
    const deltas: number[] = []
    const loop = new GameLoop({ clock: clock.clock, step: (dt) => { expect(dt).toBe(SIM_DT); steps++ }, beforeFrame: (dt) => deltas.push(dt) })
    loop.start()
    clock.frame(60_000)
    expect(steps).toBe(MAX_STEPS_PER_FRAME)
    expect(deltas[0]).toBe(MAX_FRAME_DT)
    clock.frame(0)
    expect(steps).toBe(MAX_STEPS_PER_FRAME)
    clock.frame(1000 / 60)
    expect(steps).toBe(MAX_STEPS_PER_FRAME + 1)
    loop.stop()
  })
  it('polls pause/resume before simulation even on a frame with no tick and discards resume delta', () => {
    const clock = frameClock()
    let steps = 0, uiFrames = 0, toggle = false
    const loop = new GameLoop({ clock: clock.clock, step: () => { steps++ }, beforeFrame: () => {
      uiFrames++
      if (toggle) { toggle = false; if (loop.paused) loop.resume(); else loop.pause() }
    } })
    loop.start()
    toggle = true; clock.frame(1)
    expect(loop.paused).toBe(true)
    clock.frame(10_000)
    toggle = true; clock.frame(10_000)
    expect(loop.paused).toBe(false)
    expect(steps).toBe(0)
    expect(uiFrames).toBe(3)
    clock.frame(1000 / 60)
    expect(steps).toBe(1)
    loop.stop()
  })
  it('resets fractional debt on restart and stops catch-up when a tick pauses', () => {
    const clock = frameClock()
    let steps = 0
    const loop = new GameLoop({ clock: clock.clock, step: () => { steps++; loop.pause() } })
    loop.start(); clock.frame(8)
    loop.stop(); loop.start(); clock.frame(9)
    expect(steps).toBe(0)
    clock.frame(1000)
    expect(steps).toBe(1)
    loop.resume(); clock.frame(1)
    expect(steps).toBe(1)
    loop.stop()
  })
})
