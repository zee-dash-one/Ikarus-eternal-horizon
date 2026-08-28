import type { VirtualToken } from '../../core/input-types.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'

export class GamepadInputAdapter implements InputAdapter {
  readonly scheme = 'gamepad' as const
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()
  private _moveX = 0
  private _moveZ = 0

  attach(): void {
    /* polling only */
  }

  detach(): void {
    this._down.clear()
    this._pressed.clear()
  }

  update(): void {
    const pads = navigator.getGamepads?.() ?? []
    const pad = pads[0]
    this._down.clear()
    if (!pad) {
      this._moveX = 0
      this._moveZ = 0
      return
    }
    const ax = pad.axes[0] ?? 0
    const ay = pad.axes[1] ?? 0
    this._moveX = Math.abs(ax) > 0.2 ? ax : 0
    this._moveZ = Math.abs(ay) > 0.2 ? ay : 0
    for (let i = 0; i < pad.buttons.length; i++) {
      const token = (`button${i}` as string) in { button0: 1 } ? null : null
      void token
      const name = `button${i}`
      const mapped =
        name === 'button0'
          ? 'A'
          : name === 'button1'
            ? 'B'
            : name === 'button2'
              ? 'X'
              : name === 'button3'
                ? 'Y'
                : name === 'button5'
                  ? 'R1'
                  : name === 'button7'
                    ? 'R2'
                    : null
      if (mapped && pad.buttons[i]?.pressed) {
        this._down.add(mapped)
        this._pressed.add(mapped)
      }
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

  axis(name: 'moveX' | 'moveZ'): number {
    return name === 'moveX' ? this._moveX : this._moveZ
  }
}
