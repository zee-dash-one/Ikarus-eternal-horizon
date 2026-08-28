import type { VirtualToken } from '../../core/input-types.ts'
import {
  keyboardTokenFromCode,
  type KeyboardBindings,
} from '../../core/input-bindings.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'

/** Keyboard → virtual pad (live bindings). */
export class KeyboardInputAdapter implements InputAdapter {
  readonly scheme = 'keyboard' as const
  private readonly _getKeyboard: () => KeyboardBindings
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
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

  constructor(getKeyboard: () => KeyboardBindings) {
    this._getKeyboard = getKeyboard
  }

  attach(): void {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
  }

  detach(): void {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    this._down.clear()
    this._pressed.clear()
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
    if (name === 'moveX') {
      let v = 0
      if (this._down.has('Left')) {
        v -= 1
      }
      if (this._down.has('Right')) {
        v += 1
      }
      return v
    }
    let v = 0
    if (this._down.has('Up')) {
      v -= 1
    }
    if (this._down.has('Down')) {
      v += 1
    }
    return v
  }
}
