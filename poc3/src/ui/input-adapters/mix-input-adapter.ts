import type { VirtualToken } from '../../core/input-types.ts'
import type { InputAdapter } from '../../systems/input-manager.ts'
import { KeyboardInputAdapter } from './keyboard-input-adapter.ts'

export class MixInputAdapter implements InputAdapter {
  readonly scheme = 'mix' as const
  private readonly _keyboard = new KeyboardInputAdapter()
  private readonly _mouseDown = new Set<VirtualToken>()
  private readonly _mousePressed = new Set<VirtualToken>()
  private readonly _onMouseDown = (e: MouseEvent): void => {
    const key = `Mouse${e.button}`
    const token = key === 'Mouse0' ? 'A' : key === 'Mouse2' ? 'B' : null
    if (token) {
      this._mouseDown.add(token)
      this._mousePressed.add(token)
    }
  }
  private readonly _onMouseUp = (e: MouseEvent): void => {
    const key = `Mouse${e.button}`
    const token = key === 'Mouse0' ? 'A' : key === 'Mouse2' ? 'B' : null
    if (token) {
      this._mouseDown.delete(token)
    }
  }

  attach(): void {
    this._keyboard.attach()
    window.addEventListener('mousedown', this._onMouseDown)
    window.addEventListener('mouseup', this._onMouseUp)
  }

  detach(): void {
    this._keyboard.detach()
    window.removeEventListener('mousedown', this._onMouseDown)
    window.removeEventListener('mouseup', this._onMouseUp)
    this._mouseDown.clear()
    this._mousePressed.clear()
  }

  update(): void {
    this._keyboard.update()
  }

  isDown(token: VirtualToken): boolean {
    return this._keyboard.isDown(token) || this._mouseDown.has(token)
  }

  wasPressed(token: VirtualToken): boolean {
    const kb = this._keyboard.wasPressed(token)
    const mouse = this._mousePressed.has(token)
    this._mousePressed.delete(token)
    return kb || mouse
  }

  axis(name: 'moveX' | 'moveZ'): number {
    return this._keyboard.axis(name)
  }
}
