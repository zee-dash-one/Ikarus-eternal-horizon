import type { VirtualToken } from '../../core/input-types.ts'
import {
  isKeyboardBoundCode,
  keyboardTokenFromCode,
  type KeyboardBindings,
} from '../../core/input-bindings.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'
import {
  shouldCaptureKeyboardPress,
  shouldCaptureKeyboardRelease,
} from './dom-input-guard.ts'

const VIRTUAL_TOKENS: VirtualToken[] = [
  'Up',
  'Down',
  'Left',
  'Right',
  'Start',
  'A',
  'B',
  'X',
  'Y',
  'R1',
  'R2',
]

/** Keyboard → virtual pad (live bindings). */
export class KeyboardInputAdapter implements InputAdapter {
  readonly scheme = 'keyboard' as const
  private readonly _getKeyboard: () => KeyboardBindings
  private readonly _shouldCaptureDom: () => boolean
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    const keyboard = this._getKeyboard()
    if (!shouldCaptureKeyboardPress(keyboard, e.code, e.target, this._shouldCaptureDom())) {
      return
    }
    if (isKeyboardBoundCode(keyboard, e.code)) {
      e.preventDefault()
    }
    const token = keyboardTokenFromCode(keyboard, e.code)
    if (token) {
      this._down.add(token)
      this._pressed.add(token)
    }
  }
  private readonly _onKeyUp = (e: KeyboardEvent): void => {
    const keyboard = this._getKeyboard()
    if (!shouldCaptureKeyboardRelease(keyboard, e.code, e.target)) {
      return
    }
    const token = keyboardTokenFromCode(keyboard, e.code)
    if (token) {
      this._down.delete(token)
    }
  }

  constructor(getKeyboard: () => KeyboardBindings, shouldCaptureDom: () => boolean) {
    this._getKeyboard = getKeyboard
    this._shouldCaptureDom = shouldCaptureDom
    void VIRTUAL_TOKENS
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

  clearHeld(): void {
    this._down.clear()
    this._pressed.clear()
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
