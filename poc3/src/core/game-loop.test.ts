import { describe, it, expect } from 'vitest'
import { GameLoop, SIM_DT } from './game-loop.ts'

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
})
