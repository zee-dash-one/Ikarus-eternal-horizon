import {
  assignGamepadButton,
  assignKeyboard,
  assignMouseButton,
  assignTouchSlot,
  cloneInputBindings,
  createDefaultInputBindings,
  resetInputBindings,
  type BindAction,
  type InputBindings,
  type MouseButtonAction,
  type TouchSlotId,
} from '../core/input-bindings.ts'

export class InputBindingsManager {
  private _bindings: InputBindings = createDefaultInputBindings()
  private _revision = 0

  get bindings(): Readonly<InputBindings> {
    return this._bindings
  }

  get revision(): number {
    return this._revision
  }

  load(source: InputBindings): void {
    this._bindings = cloneInputBindings(source)
    this._bump()
  }

  resetToDefaults(): void {
    resetInputBindings(this._bindings)
    this._bump()
  }

  assignKeyboard(action: BindAction, code: string): void {
    assignKeyboard(this._bindings, action, code)
    this._bump()
  }

  assignMouseButton(action: MouseButtonAction, button: number | null): void {
    assignMouseButton(this._bindings, action, button)
    this._bump()
  }

  setMouseMoveEnabled(enabled: boolean): void {
    if (this._bindings.mouse.moveEnabled === enabled) {
      return
    }
    this._bindings.mouse.moveEnabled = enabled
    this._bump()
  }

  assignGamepadButton(action: MouseButtonAction, button: number): void {
    assignGamepadButton(this._bindings, action, button)
    this._bump()
  }

  assignTouchSlot(slot: TouchSlotId, action: BindAction): void {
    assignTouchSlot(this._bindings, slot, action)
    this._bump()
  }

  private _bump(): void {
    this._revision += 1
  }
}
