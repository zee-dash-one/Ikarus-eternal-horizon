import type { VirtualToken } from '../../core/input-types.ts'
import {
  gamepadTokenFromButton,
  type GamepadBindings,
} from '../../core/input-bindings.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) {
    return 0
  }
  const sign = value < 0 ? -1 : 1
  return (sign * (Math.abs(value) - deadzone)) / (1 - deadzone)
}

/** Gamepad layout → virtual pad (live bindings). */
export class GamepadInputAdapter implements InputAdapter {
  readonly scheme = 'gamepad' as const
  private readonly _getGamepad: () => GamepadBindings
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
  private readonly _prevButtons = new Map<number, boolean>()
  private _moveX = 0
  private _moveZ = 0

  constructor(getGamepad: () => GamepadBindings) {
    this._getGamepad = getGamepad
  }

  attach(): void {
    /* poll only */
  }

  detach(): void {
    this._down.clear()
    this._pressed.clear()
    this._prevButtons.clear()
    this._moveX = 0
    this._moveZ = 0
  }

  update(): void {
    const cfg = this._getGamepad()
    const pads = navigator.getGamepads?.() ?? []
    const pad = pads[0]
    this._down.clear()
    if (!pad) {
      this._moveX = 0
      this._moveZ = 0
      return
    }

    const ax = pad.axes[cfg.axes.moveX] ?? 0
    const az = pad.axes[cfg.axes.moveZ] ?? 0
    this._moveX = applyDeadzone(ax, cfg.deadzone)
    this._moveZ = applyDeadzone(az, cfg.deadzone)
    if (cfg.invertMoveZ) {
      this._moveZ *= -1
    }

    for (let i = 0; i < pad.buttons.length; i++) {
      const pressed = pad.buttons[i]?.pressed === true
      const token = gamepadTokenFromButton(cfg, i)
      if (token && pressed) {
        this._down.add(token)
      }
      const was = this._prevButtons.get(i) === true
      if (token && pressed && !was) {
        this._pressed.add(token)
      }
      this._prevButtons.set(i, pressed)
    }
  }

  isDown(token: VirtualToken): boolean {
    return this._down.has(token)
  }

  wasPressed(token: VirtualToken): boolean {
    const v = this._pressed.has(token)
    this._pressed.delete(token)
    return v
  }

  clearPressed(token: VirtualToken): void {
    this._pressed.delete(token)
  }

  axis(name: 'moveX' | 'moveZ'): number {
    return name === 'moveX' ? this._moveX : this._moveZ
  }
}
