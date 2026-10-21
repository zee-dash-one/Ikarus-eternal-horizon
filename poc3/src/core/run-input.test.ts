import { it, expect } from 'vitest'
import { RunInputBuffer, RunInputState, EMPTY_RUN_INPUT } from './run-input.ts'

it('retains a press across zero-step frames and consumes it only in the first catch-up tick', () => {
  const buffer = new RunInputBuffer(), state = new RunInputState()
  buffer.sample({ moveX: 0.5, moveZ: -1, held: ['A'], pressed: ['R1'] })
  buffer.sample({ moveX: 1, moveZ: 0, held: ['A'], pressed: [] })
  state.load(buffer.consume())
  expect(state.axis('moveX')).toBe(1)
  expect(state.isDown('A')).toBe(true)
  expect(state.wasPressed('R1')).toBe(true)
  expect(state.wasPressed('R1')).toBe(false)
  state.load(buffer.consume())
  expect(state.wasPressed('R1')).toBe(false)
  expect(state.isDown('A')).toBe(true)
  buffer.clear()
  expect(buffer.consume()).toEqual(EMPTY_RUN_INPUT)
})
