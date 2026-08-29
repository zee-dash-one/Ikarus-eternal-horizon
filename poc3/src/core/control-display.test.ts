import { describe, expect, it } from 'vitest'
import {
  assignKeyboard,
  assignKeyboardPause,
  assignMouseInput,
  cloneInputBindings,
  createDefaultInputBindings,
  formatKeyboardPauseBinding,
  formatMouseInput,
  gamepadTokenFromButton,
  KEYBOARD_PAUSE_DEFAULT,
  keyboardTokenFromCode,
  PAUSE_VIRTUAL_TOKEN,
} from './input-bindings.ts'
import { resolveControlBindings } from './control-display.ts'

describe('input-bindings', () => {
  it('defaults match BALANCE keyboard map', () => {
    const bindings = createDefaultInputBindings()
    expect(bindings.keyboard.up).toBe('KeyW')
    expect(bindings.keyboard.shoot).toBe('KeyF')
    expect(bindings.keyboard.pause).toBe(KEYBOARD_PAUSE_DEFAULT)
    expect(bindings.mouse.shoot).toBe(0)
  })

  it('assignKeyboardPause swaps conflicting keys', () => {
    const bindings = createDefaultInputBindings()
    assignKeyboardPause(bindings, 'KeyW')
    expect(bindings.keyboard.pause).toBe('KeyW')
    expect(bindings.keyboard.up).toBe(KEYBOARD_PAUSE_DEFAULT)
    expect(formatKeyboardPauseBinding(bindings.keyboard)).toBe('W')
  })

  it('assignKeyboard swaps conflicting keys', () => {
    const bindings = createDefaultInputBindings()
    assignKeyboard(bindings, 'shoot', 'KeyW')
    expect(bindings.keyboard.shoot).toBe('KeyW')
    expect(bindings.keyboard.up).toBe('KeyF')
  })

  it('assignMouseInput swaps colliding wheel bindings', () => {
    const bindings = createDefaultInputBindings()
    assignMouseInput(bindings, 'switchWeapon', 'wheelUp')
    assignMouseInput(bindings, 'switchBomb', 'wheelUp')
    expect(bindings.mouse.switchWeapon).toBe(null)
    expect(bindings.mouse.switchBomb).toBe('wheelUp')
    expect(formatMouseInput('wheelDown')).toBe('Wheel down')
  })

  it('clampMouseSteerSensitivity accepts string-like persisted values via normalize', () => {
    const bindings = createDefaultInputBindings()
    bindings.mouse.moveSensitivity = '2.5' as unknown as number
    const normalized = cloneInputBindings(bindings)
    expect(normalized.mouse.moveSensitivity).toBe(2.5)
  })

  it('keyboard pause binding maps to Start token', () => {
    const bindings = createDefaultInputBindings()
    expect(keyboardTokenFromCode(bindings.keyboard, KEYBOARD_PAUSE_DEFAULT)).toBe(PAUSE_VIRTUAL_TOKEN)
    bindings.keyboard.pause = null
    expect(keyboardTokenFromCode(bindings.keyboard, KEYBOARD_PAUSE_DEFAULT)).toBeNull()
  })

  it('gamepad pause button maps to Start token', () => {
    const bindings = createDefaultInputBindings()
    expect(bindings.gamepad.pause).toBe(9)
    expect(gamepadTokenFromButton(bindings.gamepad, 9)).toBe(PAUSE_VIRTUAL_TOKEN)
    bindings.gamepad.pause = null
    expect(gamepadTokenFromButton(bindings.gamepad, 9)).toBeNull()
    expect(gamepadTokenFromButton(bindings.gamepad, bindings.gamepad.shoot)).toBe('A')
  })
})

describe('resolveControlBindings', () => {
  it('keyboard shows remapped keys', () => {
    const bindings = createDefaultInputBindings()
    assignKeyboard(bindings, 'shoot', 'KeyE')
    const rows = resolveControlBindings('keyboard', bindings)
    expect(rows.find((r) => r.label === 'Shoot')?.binding).toBe('E')
  })

  it('mix shows mouse movement note via enabled flag in UI separately', () => {
    const bindings = createDefaultInputBindings()
    const rows = resolveControlBindings('mix', bindings)
    expect(rows.find((r) => r.label === 'Shoot')?.binding).toContain('Left click')
    expect(rows.find((r) => r.label === 'Up')?.binding).toContain('Mouse move')
  })

  it('mix movement rows hide mouse move when steering disabled', () => {
    const bindings = createDefaultInputBindings()
    bindings.mouse.moveEnabled = false
    const rows = resolveControlBindings('mix', bindings)
    expect(rows.find((r) => r.label === 'Up')?.binding).toBe('W')
    expect(rows.find((r) => r.label === 'Up')?.binding).not.toContain('Mouse move')
  })
})
