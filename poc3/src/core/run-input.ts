import type { VirtualToken } from './input-types.ts'

/** DOM-free virtual pad consumed by gameplay systems. Start belongs to the UI clock. */
export interface GameplayInput {
  axis(name: 'moveX' | 'moveZ'): number
  isDown(token: VirtualToken): boolean
  wasPressed(token: VirtualToken): boolean
}
export interface RunInputFrame {
  readonly moveX: number
  readonly moveZ: number
  readonly held: readonly VirtualToken[]
  readonly pressed: readonly VirtualToken[]
}
export const GAMEPLAY_TOKENS: readonly VirtualToken[] = ['Up', 'Down', 'Left', 'Right', 'A', 'B', 'X', 'Y', 'R1', 'R2']
export const EMPTY_RUN_INPUT: RunInputFrame = Object.freeze({ moveX: 0, moveZ: 0, held: [], pressed: [] })

/** Retains edges on frames with no sim tick; consumes them once during catch-up. */
export class RunInputBuffer {
  private _latest: RunInputFrame = EMPTY_RUN_INPUT
  private readonly _pressed = new Set<VirtualToken>()
  sample(frame: RunInputFrame): void {
    this._latest = frame
    for (const token of frame.pressed) this._pressed.add(token)
  }
  consume(): RunInputFrame {
    const frame = { ...this._latest, pressed: [...this._pressed] }
    this._pressed.clear()
    return frame
  }
  clear(): void { this._latest = EMPTY_RUN_INPUT; this._pressed.clear() }
}

export class RunInputState implements GameplayInput {
  private _frame = EMPTY_RUN_INPUT
  private readonly _pressed = new Set<VirtualToken>()
  load(frame: RunInputFrame): void {
    this._frame = frame
    this._pressed.clear()
    for (const token of frame.pressed) this._pressed.add(token)
  }
  axis(name: 'moveX' | 'moveZ'): number { return name === 'moveX' ? this._frame.moveX : this._frame.moveZ }
  isDown(token: VirtualToken): boolean { return this._frame.held.includes(token) }
  wasPressed(token: VirtualToken): boolean { const pressed = this._pressed.delete(token); return pressed }
}
