import type { InputScheme, VirtualToken } from '../core/input-types.ts'
import type { Command } from '../core/command.ts'
import { KeyboardInputAdapter } from '../ui/input-adapters/keyboard-input-adapter.ts'
import { MixInputAdapter } from '../ui/input-adapters/mix-input-adapter.ts'
import { GamepadInputAdapter } from '../ui/input-adapters/gamepad-input-adapter.ts'
import { TouchInputAdapter } from '../ui/input-adapters/touch-input-adapter.ts'

export type { InputScheme, VirtualToken }

export interface InputAdapter {
  readonly scheme: InputScheme
  attach(): void
  detach(): void
  update(): void
  isDown(token: VirtualToken): boolean
  wasPressed(token: VirtualToken): boolean
  axis(name: 'moveX' | 'moveZ'): number
}

export class InputManager {
  private _scheme: InputScheme = 'keyboard'
  private _adapters: Record<InputScheme, InputAdapter>
  private _active: InputAdapter
  private readonly _commands: Command[] = []

  constructor(host?: HTMLElement) {
    this._adapters = {
      keyboard: new KeyboardInputAdapter(),
      mix: new MixInputAdapter(),
      gamepad: new GamepadInputAdapter(),
      touch: new TouchInputAdapter(host),
    }
    this._active = this._adapters.keyboard
    this._active.attach()
  }

  get scheme(): InputScheme {
    return this._scheme
  }

  update(): void {
    this._active.update()
  }

  isDown(token: VirtualToken): boolean {
    return this._active.isDown(token)
  }

  wasPressed(token: VirtualToken): boolean {
    return this._active.wasPressed(token)
  }

  axis(name: 'moveX' | 'moveZ'): number {
    return this._active.axis(name)
  }

  setScheme(scheme: InputScheme): void {
    if (scheme === this._scheme) {
      return
    }
    this._active.detach()
    this._scheme = scheme
    this._active = this._adapters[scheme]
    this._active.attach()
    this._commands.push({ type: 'input_scheme', scheme })
  }

  drainCommands(): readonly Command[] {
    const out = this._commands.slice()
    this._commands.length = 0
    return out
  }

  dispose(): void {
    this._active.detach()
  }
}
