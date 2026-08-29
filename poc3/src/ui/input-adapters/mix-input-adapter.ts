import { BALANCE } from '../../core/balancer.ts'
import type { VirtualToken } from '../../core/input-types.ts'
import {
  isKeyboardBoundCode,
  keyboardTokenFromCode,
  mouseTokenFromButton,
  mouseTokenFromInput,
  type KeyboardBindings,
  type MouseBindings,
} from '../../core/input-bindings.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'
import {
  shouldCaptureKeyboardPress,
  shouldCaptureKeyboardRelease,
  shouldIgnoreDomPress,
  shouldIgnoreDomRelease,
} from './dom-input-guard.ts'
import {
  applyMouseSteerImpulse,
  createMouseSteerHoldState,
  mouseHoldThresholdPx,
  resetMouseSteerHold,
  tickMouseSteerHold,
  type MouseSteerHoldState,
} from './mouse-steer-hold.ts'

function combineAxis(keyboard: number, mouse: number): number {
  if (keyboard !== 0) {
    return keyboard
  }
  return mouse
}

/** Keyboard + mouse buttons + mouse-move virtual hold steering (live bindings). */
export class MixInputAdapter implements InputAdapter {
  readonly scheme = 'mix' as const
  private readonly _getKeyboard: () => KeyboardBindings
  private readonly _getMouse: () => MouseBindings
  private readonly _shouldCaptureDom: () => boolean
  private readonly _host: HTMLElement | undefined
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
  private readonly _steer: MouseSteerHoldState = createMouseSteerHoldState()
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
  private readonly _onMouseDown = (e: MouseEvent): void => {
    if (shouldIgnoreDomPress(e.target, this._shouldCaptureDom())) {
      return
    }
    const token = mouseTokenFromButton(this._getMouse(), e.button)
    if (token) {
      e.preventDefault()
      this._down.add(token)
      this._pressed.add(token)
    }
  }
  private readonly _onMouseUp = (e: MouseEvent): void => {
    if (shouldIgnoreDomRelease(e.target)) {
      return
    }
    const token = mouseTokenFromButton(this._getMouse(), e.button)
    if (token) {
      this._down.delete(token)
    }
  }
  private readonly _onMouseMove = (e: MouseEvent): void => {
    const mouse = this._getMouse()
    if (!mouse.moveEnabled) {
      this.resetSteer()
      return
    }
    const threshold = mouseHoldThresholdPx(mouse.moveSensitivity)
    applyMouseSteerImpulse(
      this._steer,
      e.movementX,
      e.movementY,
      threshold,
      performance.now(),
    )
  }
  private readonly _onMouseLeave = (): void => {
    this.resetSteer()
  }
  private readonly _onWheel = (e: WheelEvent): void => {
    if (shouldIgnoreDomPress(e.target, this._shouldCaptureDom())) {
      return
    }
    if (e.deltaY === 0) {
      return
    }
    const input = e.deltaY < 0 ? 'wheelUp' : 'wheelDown'
    const token = mouseTokenFromInput(this._getMouse(), input)
    if (token) {
      e.preventDefault()
      this._pressed.add(token)
    }
  }
  private readonly _onContextMenu = (e: Event): void => {
    if (mouseTokenFromButton(this._getMouse(), 2)) {
      e.preventDefault()
    }
  }

  constructor(
    getKeyboard: () => KeyboardBindings,
    getMouse: () => MouseBindings,
    shouldCaptureDom: () => boolean,
    host?: HTMLElement,
  ) {
    this._getKeyboard = getKeyboard
    this._getMouse = getMouse
    this._shouldCaptureDom = shouldCaptureDom
    this._host = host
  }

  attach(): void {
    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('mousedown', this._onMouseDown)
    window.addEventListener('mouseup', this._onMouseUp)
    document.addEventListener('mousemove', this._onMouseMove)
    this._host?.addEventListener('mouseleave', this._onMouseLeave)
    this._host?.addEventListener('wheel', this._onWheel, { passive: false })
    this._host?.addEventListener('contextmenu', this._onContextMenu)
  }

  detach(): void {
    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('mousedown', this._onMouseDown)
    window.removeEventListener('mouseup', this._onMouseUp)
    document.removeEventListener('mousemove', this._onMouseMove)
    this._host?.removeEventListener('mouseleave', this._onMouseLeave)
    this._host?.removeEventListener('wheel', this._onWheel)
    this._host?.removeEventListener('contextmenu', this._onContextMenu)
    this._down.clear()
    this._pressed.clear()
    this.resetSteer()
  }

  resetSteer(): void {
    resetMouseSteerHold(this._steer)
  }

  clearHeld(): void {
    this._down.clear()
    this._pressed.clear()
    this.resetSteer()
  }

  update(): void {
    if (!this._getMouse().moveEnabled) {
      this.resetSteer()
      return
    }
    tickMouseSteerHold(
      this._steer,
      BALANCE.controls.mouse.moveHoldGraceMs,
      performance.now(),
    )
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
    const mouseSteer = this._getMouse().moveEnabled
    let keyboard = 0
    if (name === 'moveX') {
      if (this._down.has('Left')) {
        keyboard -= 1
      }
      if (this._down.has('Right')) {
        keyboard += 1
      }
      return combineAxis(keyboard, mouseSteer ? this._steer.holdX : 0)
    }
    if (this._down.has('Up')) {
      keyboard -= 1
    }
    if (this._down.has('Down')) {
      keyboard += 1
    }
    return combineAxis(keyboard, mouseSteer ? this._steer.holdZ : 0)
  }
}
