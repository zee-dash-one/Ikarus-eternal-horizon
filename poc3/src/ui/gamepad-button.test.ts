import { describe, expect, it } from 'vitest'
import { isGamepadButtonDown } from './gamepad-button.ts'

describe('isGamepadButtonDown', () => {
  it('accepts pressed flag', () => {
    expect(isGamepadButtonDown({ pressed: true, value: 0, touched: false })).toBe(true)
  })

  it('accepts analog value without pressed flag', () => {
    expect(isGamepadButtonDown({ pressed: false, value: 1, touched: false })).toBe(true)
  })

  it('rejects idle button', () => {
    expect(isGamepadButtonDown({ pressed: false, value: 0, touched: false })).toBe(false)
  })
})
