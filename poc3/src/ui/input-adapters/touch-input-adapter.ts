import type { VirtualToken } from '../../core/input-types.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'

export class TouchInputAdapter implements InputAdapter {
  readonly scheme = 'touch' as const
  private readonly _host: HTMLElement | undefined
  private _moveX = 0
  private _moveZ = 0
  private readonly _down = new Set<VirtualToken>()
  private readonly _pressed = new Set<VirtualToken>()

  constructor(host?: HTMLElement) {
    this._host = host
  }

  attach(): void {
    void this._host
  }

  detach(): void {
    this._down.clear()
    this._pressed.clear()
  }

  update(): void {
    /* nipplejs wired in View layer when touch scheme active */
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

  setAxis(moveX: number, moveZ: number): void {
    this._moveX = moveX
    this._moveZ = moveZ
  }

  press(token: VirtualToken): void {
    this._down.add(token)
    this._pressed.add(token)
  }

  release(token: VirtualToken): void {
    this._down.delete(token)
  }
}
