import { BALANCE } from '../../core/balancer.ts'
import type { VirtualToken } from '../../core/input-types.ts'
import {
  keyboardTokenFromCode,
  mouseTokenFromButton,
  type KeyboardBindings,
  type MouseBindings,
} from '../../core/input-bindings.ts'
import { clamp } from '../../core/math.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'

function combineAxis(keyboard: number, mouse: number): number {
  if (keyboard !== 0) {
    return keyboard
  }
  return clamp(mouse, -1, 1)
}

/** Keyboard + mouse buttons + pointer steering (live bindings). */
export class MixInputAdapter implements InputAdapter {
  readonly scheme = 'mix' as const
  private readonly _getKeyboard: () => KeyboardBindings
  private readonly _getMouse: () => MouseBindings
  private readonly _host: HTMLElement | undefined
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
  private _mouseAxisX = 0
  private _mouseAxisZ = 0
  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    const keyboard = this._getKeyboard()
    if (Object.values(keyboard).includes(e.code)) {
      e.preventDefault()
    }
    const token = keyboardTokenFromCode(keyboard, e.code)
    if (token) {
      this._down.add(token)
      this._pressed.add(token)
    }
  }
  private readonly _onKeyUp = (e: KeyboardEvent): void => {
    const token = keyboardTokenFromCode(this._getKeyboard(), e.code)
    if (token) {
      this._down.delete(token)
    }
  }
  private readonly _onMouseDown = (e: MouseEvent): void => {
    const token = mouseTokenFromButton(this._getMouse(), e.button)
    if (token) {
      e.preventDefault()
      this._down.add(token)
      this._pressed.add(token)
    }
  }
  private readonly _onMouseUp = (e: MouseEvent): void => {
    const token = mouseTokenFromButton(this._getMouse(), e.button)
    if (token) {
      this._down.delete(token)
    }
  }
  private readonly _onMouseMove = (e: MouseEvent): void => {
    const mouse = this._getMouse()
    if (!mouse.moveEnabled || !this._host) {
      return
    }
    const rect = this._host.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const radius = Math.min(rect.width, rect.height) * BALANCE.controls.mouse.moveRadiusFrac
    if (radius <= 0) {
      return
    }
    this._mouseAxisX = clamp((e.clientX - cx) / radius, -1, 1)
    this._mouseAxisZ = clamp((e.clientY - cy) / radius, -1, 1)
  }
  private readonly _onMouseLeave = (): void => {
    this._mouseAxisX = 0
    this._mouseAxisZ = 0
  }

  constructor(
    getKeyboard: () => KeyboardBindings,
    getMouse: () => MouseBindings,
    host?: HTMLElement,
  ) {
    this._getKeyboard = getKeyboard
    this._getMouse = getMouse
    this._host = host
  }

  attach(): void {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('mousedown', this._onMouseDown)
    window.addEventListener('mouseup', this._onMouseUp)
    window.addEventListener('mousemove', this._onMouseMove)
    this._host?.addEventListener('mouseleave', this._onMouseLeave)
  }

  detach(): void {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('mousedown', this._onMouseDown)
    window.removeEventListener('mouseup', this._onMouseUp)
    window.removeEventListener('mousemove', this._onMouseMove)
    this._host?.removeEventListener('mouseleave', this._onMouseLeave)
    this._down.clear()
    this._pressed.clear()
    this._mouseAxisX = 0
    this._mouseAxisZ = 0
  }

  update(): void {
    /* pressed cleared at read */
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
    let keyboard = 0
    if (name === 'moveX') {
      if (this._down.has('Left')) {
        keyboard -= 1
      }
      if (this._down.has('Right')) {
        keyboard += 1
      }
      return combineAxis(keyboard, this._mouseAxisX)
    }
    if (this._down.has('Up')) {
      keyboard -= 1
    }
    if (this._down.has('Down')) {
      keyboard += 1
    }
    return combineAxis(keyboard, this._mouseAxisZ)
  }
}
