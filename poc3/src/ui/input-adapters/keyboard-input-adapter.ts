import { BALANCE } from '../../core/balancer.ts'
import type { VirtualToken } from '../../core/input-types.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'

const TOKENS: VirtualToken[] = [
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

export class KeyboardInputAdapter implements InputAdapter {
  readonly scheme = 'keyboard' as const
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    const token = BALANCE.controls.keyboard[e.code] as VirtualToken | undefined
    if (token && TOKENS.includes(token)) {
      this._down.add(token)
      this._pressed.add(token)
    }
  }
  private readonly _onKeyUp = (e: KeyboardEvent): void => {
    const token = BALANCE.controls.keyboard[e.code] as VirtualToken | undefined
    if (token) {
      this._down.delete(token)
    }
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
    /* pressed cleared at end of frame */
  }

  isDown(token: VirtualToken): boolean {
    return this._down.has(token)
  }

  wasPressed(token: VirtualToken): boolean {
    const v = this._pressed.has(token)
    this._pressed.delete(token)
    return v
  }

  axis(name: 'moveX' | 'moveZ'): number {
    if (name === 'moveX') {
      let v = 0
      if (this._down.has('Left')) v -= 1
      if (this._down.has('Right')) v += 1
      return v
    }
    let v = 0
    if (this._down.has('Up')) v -= 1
    if (this._down.has('Down')) v += 1
    return v
  }
}
