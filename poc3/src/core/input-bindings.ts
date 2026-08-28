import { BALANCE } from './balancer.ts'
import type { VirtualToken } from './input-types.ts'

export type BindAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'shoot'
  | 'switchWeapon'
  | 'bomb'
  | 'switchBomb'
  | 'dash'

export type MouseButtonAction = Exclude<BindAction, 'up' | 'down' | 'left' | 'right'>

export const BIND_ACTIONS: readonly BindAction[] = [
  'up',
  'down',
  'left',
  'right',
  'shoot',
  'switchWeapon',
  'bomb',
  'switchBomb',
  'dash',
]

export const MOUSE_BUTTON_ACTIONS: readonly MouseButtonAction[] = [
  'shoot',
  'bomb',
  'switchWeapon',
  'switchBomb',
  'dash',
]

export const BIND_ACTION_LABELS: Record<BindAction, string> = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  shoot: 'Shoot',
  switchWeapon: 'Switch Weapon',
  bomb: 'Bomb',
  switchBomb: 'Switch Bomb',
  dash: 'Dash',
}

export const BIND_ACTION_TO_TOKEN: Record<BindAction, VirtualToken> = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  shoot: 'A',
  switchWeapon: 'X',
  bomb: 'B',
  switchBomb: 'Y',
  dash: 'R1',
}

export interface KeyboardBindings {
  up: string
  down: string
  left: string
  right: string
  shoot: string
  switchWeapon: string
  bomb: string
  switchBomb: string
  dash: string
}

export interface MouseBindings {
  moveEnabled: boolean
  shoot: number | null
  bomb: number | null
  switchWeapon: number | null
  switchBomb: number | null
  dash: number | null
}

export interface GamepadBindings {
  invertMoveZ: boolean
  deadzone: number
  axes: { moveX: number; moveZ: number }
  shoot: number
  bomb: number
  switchWeapon: number
  switchBomb: number
  dash: number
}

export type TouchSlotId = 'fire' | 'bomb' | 'switchWeapon' | 'switchBomb' | 'dash'

export const TOUCH_SLOT_IDS: readonly TouchSlotId[] = [
  'fire',
  'bomb',
  'switchWeapon',
  'switchBomb',
  'dash',
]

export const TOUCH_SLOT_LABELS: Record<TouchSlotId, string> = {
  fire: 'Fire button',
  bomb: 'Bomb button',
  switchWeapon: 'Switch weapon button',
  switchBomb: 'Switch bomb button',
  dash: 'Dash button',
}

export interface TouchSlotBindings {
  fire: BindAction
  bomb: BindAction
  switchWeapon: BindAction
  switchBomb: BindAction
  dash: BindAction
}

export interface InputBindings {
  keyboard: KeyboardBindings
  mouse: MouseBindings
  gamepad: GamepadBindings
  touch: TouchSlotBindings
}

const PAD_BUTTON_LABELS = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'Select',
  'Start',
  'L3',
  'R3',
  'D-Up',
  'D-Down',
  'D-Left',
  'D-Right',
] as const

const MOUSE_BUTTON_LABELS = ['Left click', 'Middle click', 'Right click'] as const

function tokenToBindAction(token: string): BindAction | null {
  for (const action of BIND_ACTIONS) {
    if (BIND_ACTION_TO_TOKEN[action] === token) {
      return action
    }
  }
  return null
}

function keyboardFromTokenMap(map: Readonly<Record<string, string>>): KeyboardBindings {
  const out: KeyboardBindings = {
    up: 'KeyW',
    down: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    shoot: 'KeyF',
    bomb: 'KeyT',
    switchWeapon: 'KeyG',
    switchBomb: 'KeyY',
    dash: 'Space',
  }
  for (const [code, token] of Object.entries(map)) {
    if (code.startsWith('Mouse')) {
      continue
    }
    const action = tokenToBindAction(token)
    if (action) {
      out[action] = code
    }
  }
  return out
}

function mouseFromTokenMap(map: Readonly<Record<string, string>>): MouseBindings {
  const out: MouseBindings = {
    moveEnabled: true,
    shoot: null,
    bomb: null,
    switchWeapon: null,
    switchBomb: null,
    dash: null,
  }
  for (const [code, token] of Object.entries(map)) {
    if (!code.startsWith('Mouse')) {
      continue
    }
    const button = Number(code.slice(5))
    if (!Number.isFinite(button)) {
      continue
    }
    const action = tokenToBindAction(token)
    if (action && action !== 'up' && action !== 'down' && action !== 'left' && action !== 'right') {
      out[action] = button
    }
  }
  return out
}

function gamepadFromBalance(): GamepadBindings {
  const gp = BALANCE.controls.gamepad
  const out: GamepadBindings = {
    invertMoveZ: gp.invertMoveZ,
    deadzone: gp.deadzone,
    axes: { moveX: gp.axes.moveX, moveZ: gp.axes.moveZ },
    shoot: 3,
    bomb: 0,
    switchWeapon: 2,
    switchBomb: 1,
    dash: 5,
  }
  for (const [index, token] of Object.entries(gp.buttons)) {
    const action = tokenToBindAction(token)
    if (action && action !== 'up' && action !== 'down' && action !== 'left' && action !== 'right') {
      out[action] = Number(index)
    }
  }
  return out
}

function touchFromBalance(): TouchSlotBindings {
  const slots = BALANCE.controls.touch.slots
  const out: TouchSlotBindings = {
    fire: 'shoot',
    bomb: 'bomb',
    switchWeapon: 'switchWeapon',
    switchBomb: 'switchBomb',
    dash: 'dash',
  }
  for (const slotId of TOUCH_SLOT_IDS) {
    const token = slots[slotId]
    const action = token ? tokenToBindAction(token) : null
    if (action) {
      out[slotId] = action
    }
  }
  return out
}

export function createDefaultInputBindings(): InputBindings {
  return {
    keyboard: keyboardFromTokenMap(BALANCE.controls.keyboard),
    mouse: {
      ...mouseFromTokenMap(BALANCE.controls.mix),
      moveEnabled: true,
    },
    gamepad: gamepadFromBalance(),
    touch: touchFromBalance(),
  }
}

export function cloneInputBindings(source: InputBindings): InputBindings {
  return {
    keyboard: { ...source.keyboard },
    mouse: { ...source.mouse },
    gamepad: {
      ...source.gamepad,
      axes: { ...source.gamepad.axes },
    },
    touch: { ...source.touch },
  }
}

export function copyInputBindings(source: InputBindings, target: InputBindings): void {
  Object.assign(target.keyboard, source.keyboard)
  Object.assign(target.mouse, source.mouse)
  target.gamepad.invertMoveZ = source.gamepad.invertMoveZ
  target.gamepad.deadzone = source.gamepad.deadzone
  target.gamepad.axes.moveX = source.gamepad.axes.moveX
  target.gamepad.axes.moveZ = source.gamepad.axes.moveZ
  target.gamepad.shoot = source.gamepad.shoot
  target.gamepad.bomb = source.gamepad.bomb
  target.gamepad.switchWeapon = source.gamepad.switchWeapon
  target.gamepad.switchBomb = source.gamepad.switchBomb
  target.gamepad.dash = source.gamepad.dash
  Object.assign(target.touch, source.touch)
}

export function resetInputBindings(target: InputBindings): void {
  copyInputBindings(createDefaultInputBindings(), target)
}

export function assignKeyboard(bindings: InputBindings, action: BindAction, code: string): void {
  const map = bindings.keyboard
  const previous = map[action]
  if (previous === code) {
    return
  }
  for (const key of BIND_ACTIONS) {
    if (key !== action && map[key] === code) {
      map[key] = previous
    }
  }
  map[action] = code
}

export function assignMouseButton(
  bindings: InputBindings,
  action: MouseButtonAction,
  button: number | null,
): void {
  const previous = bindings.mouse[action]
  if (previous === button) {
    return
  }
  for (const key of MOUSE_BUTTON_ACTIONS) {
    if (key !== action && bindings.mouse[key] === button) {
      bindings.mouse[key] = previous
    }
  }
  bindings.mouse[action] = button
}

export function assignGamepadButton(bindings: InputBindings, action: MouseButtonAction, button: number): void {
  const map = bindings.gamepad
  const previous = map[action]
  if (previous === button) {
    return
  }
  for (const key of MOUSE_BUTTON_ACTIONS) {
    if (key !== action && map[key] === button) {
      map[key] = previous
    }
  }
  map[action] = button
}

export function assignTouchSlot(bindings: InputBindings, slot: TouchSlotId, action: BindAction): void {
  const previous = bindings.touch[slot]
  if (previous === action) {
    return
  }
  for (const slotId of TOUCH_SLOT_IDS) {
    if (slotId !== slot && bindings.touch[slotId] === action) {
      bindings.touch[slotId] = previous
    }
  }
  bindings.touch[slot] = action
}

export function keyboardTokenFromCode(bindings: KeyboardBindings, code: string): VirtualToken | null {
  for (const action of BIND_ACTIONS) {
    if (bindings[action] === code) {
      return BIND_ACTION_TO_TOKEN[action]
    }
  }
  return null
}

export function mouseTokenFromButton(bindings: MouseBindings, button: number): VirtualToken | null {
  for (const action of MOUSE_BUTTON_ACTIONS) {
    if (bindings[action] === button) {
      return BIND_ACTION_TO_TOKEN[action]
    }
  }
  return null
}

export function gamepadTokenFromButton(bindings: GamepadBindings, button: number): VirtualToken | null {
  for (const action of MOUSE_BUTTON_ACTIONS) {
    if (bindings[action] === button) {
      return BIND_ACTION_TO_TOKEN[action]
    }
  }
  return null
}

export function touchTokenForSlot(bindings: TouchSlotBindings, slot: TouchSlotId): VirtualToken {
  return BIND_ACTION_TO_TOKEN[bindings[slot]]
}

export function formatKeyCode(code: string): string {
  if (code === 'Space') {
    return 'Space'
  }
  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3)
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return code.slice(5)
  }
  if (code.startsWith('Arrow')) {
    return code.slice(5)
  }
  return code
}

export function formatMouseButton(button: number): string {
  return MOUSE_BUTTON_LABELS[button] ?? `Mouse ${button}`
}

export function formatGamepadButton(index: number): string {
  return PAD_BUTTON_LABELS[index] ?? `Button ${index}`
}

export function formatKeyboardBinding(bindings: KeyboardBindings, action: BindAction): string {
  return formatKeyCode(bindings[action])
}

export function formatMouseBinding(bindings: MouseBindings, action: MouseButtonAction): string {
  const button = bindings[action]
  return button === null ? '—' : formatMouseButton(button)
}

export function formatGamepadBinding(bindings: GamepadBindings, action: MouseButtonAction): string {
  return formatGamepadButton(bindings[action])
}

export function isInputBindings(value: unknown): value is InputBindings {
  if (!value || typeof value !== 'object') {
    return false
  }
  const candidate = value as InputBindings
  return (
    typeof candidate.keyboard === 'object'
    && typeof candidate.mouse === 'object'
    && typeof candidate.gamepad === 'object'
    && typeof candidate.touch === 'object'
  )
}
