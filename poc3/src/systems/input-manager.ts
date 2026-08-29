import type { InputScheme, VirtualToken } from '../core/input-types.ts'
import type { Command } from '../core/command.ts'
import { KeyboardInputAdapter } from '../ui/input-adapters/keyboard-input-adapter.ts'
import { MixInputAdapter } from '../ui/input-adapters/mix-input-adapter.ts'
import { GamepadInputAdapter } from '../ui/input-adapters/gamepad-input-adapter.ts'
import { TouchInputAdapter } from '../ui/input-adapters/touch-input-adapter.ts'
import { InputBindingsManager } from './input-bindings-manager.ts'

export type { InputScheme, VirtualToken }

export interface InputAdapter {
  readonly scheme: InputScheme
  attach(): void
  detach(): void
  update(dt?: number): void
  isDown(token: VirtualToken): boolean
  wasPressed(token: VirtualToken): boolean
  clearPressed(token: VirtualToken): void
  clearHeld(): void
  axis(name: 'moveX' | 'moveZ'): number
}

export class InputManager {
  readonly bindings = new InputBindingsManager()
  private _scheme: InputScheme = 'keyboard'
  private _captureDom = true
  private readonly _adapters: Record<InputScheme, InputAdapter>
  private readonly _touch: TouchInputAdapter
  private readonly _mix: MixInputAdapter
  private _active: InputAdapter
  private readonly _commands: Command[] = []

  constructor(host?: HTMLElement) {
    const touch = new TouchInputAdapter(host)
    const mix = new MixInputAdapter(
      () => this.bindings.bindings.keyboard,
      () => this.bindings.bindings.mouse,
      () => this._captureDom,
      host,
    )
    this._touch = touch
    this._mix = mix
    this._adapters = {
      keyboard: new KeyboardInputAdapter(
        () => this.bindings.bindings.keyboard,
        () => this._captureDom,
      ),
      mix,
      gamepad: new GamepadInputAdapter(() => this.bindings.bindings.gamepad),
      touch,
    }
    this._active = this._adapters.keyboard
    this._active.attach()
  }

  get scheme(): InputScheme {
    return this._scheme
  }

  /** When false, keyboard/mouse adapters ignore DOM events (pause menu, login, etc.). */
  setCaptureDom(capture: boolean): void {
    this._captureDom = capture
  }

  get touchAdapter(): TouchInputAdapter {
    return this._touch
  }

  update(dt = 0): void {
    this._active.update(dt)
  }

  resetMixSteer(): void {
    this._mix.resetSteer()
  }

  clearHeld(): void {
    this._active.clearHeld()
  }

  isDown(token: VirtualToken): boolean {
    return this._active.isDown(token)
  }

  wasPressed(token: VirtualToken): boolean {
    return this._active.wasPressed(token)
  }

  clearPressed(token: VirtualToken): void {
    this._active.clearPressed(token)
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
