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

/** Mouse button index (0–2) or wheel direction. */
export type MouseBindInput = number | 'wheelUp' | 'wheelDown' | null

export const MOVE_BIND_ACTIONS: readonly BindAction[] = ['up', 'down', 'left', 'right']

export const GAMEPLAY_BIND_ACTIONS: readonly BindAction[] = [
  'shoot',
  'switchWeapon',
  'bomb',
  'switchBomb',
  'dash',
]

export const BIND_ACTIONS: readonly BindAction[] = [...MOVE_BIND_ACTIONS, ...GAMEPLAY_BIND_ACTIONS]

export const MOUSE_BUTTON_ACTIONS: readonly MouseButtonAction[] = [
  'shoot',
  'bomb',
  'switchWeapon',
  'switchBomb',
  'dash',
]

export const MOUSE_STEER_SENSITIVITY_MIN = 0.1
export const MOUSE_STEER_SENSITIVITY_MAX = 5
export const MOUSE_STEER_SENSITIVITY_DEFAULT = 1

export const KEYBOARD_PAUSE_DEFAULT = 'Escape'

/** Virtual token emitted by every scheme's pause binding (CTRL-01). */
export const PAUSE_VIRTUAL_TOKEN = 'Start' as const

export function clampMouseSteerSensitivity(value: number): number {
  if (!Number.isFinite(value)) {
    return MOUSE_STEER_SENSITIVITY_DEFAULT
  }
  const clamped = Math.max(
    MOUSE_STEER_SENSITIVITY_MIN,
    Math.min(MOUSE_STEER_SENSITIVITY_MAX, value),
  )
  return Math.round(clamped * 100) / 100
}

function normalizeMouseSteerSensitivity(value: unknown): number {
  if (typeof value === 'number') {
    return clampMouseSteerSensitivity(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return clampMouseSteerSensitivity(Number(value))
  }
  return MOUSE_STEER_SENSITIVITY_DEFAULT
}

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
  /** Physical key → virtual Start; null = unbound (Esc behaves normally in UI). */
  pause: string | null
}

export interface MouseBindings {
  moveEnabled: boolean
  /** User steer sensitivity — higher = less pointer movement needed to hold a direction. */
  moveSensitivity: number
  shoot: MouseBindInput
  bomb: MouseBindInput
  switchWeapon: MouseBindInput
  switchBomb: MouseBindInput
  dash: MouseBindInput
}

export interface GamepadBindings {
  invertMoveZ: boolean
  deadzone: number
  axes: { moveX: number; moveZ: number }
  /** Gamepad button index → virtual Start; null = unbound. */
  pause: number | null
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
    pause: KEYBOARD_PAUSE_DEFAULT,
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

function parseMouseBindCode(code: string): MouseBindInput | null {
  if (code === 'MouseWheelUp') {
    return 'wheelUp'
  }
  if (code === 'MouseWheelDown') {
    return 'wheelDown'
  }
  if (!code.startsWith('Mouse')) {
    return null
  }
  const button = Number(code.slice(5))
  return Number.isFinite(button) ? button : null
}

function mouseFromTokenMap(map: Readonly<Record<string, string>>): MouseBindings {
  const out: MouseBindings = {
    moveEnabled: true,
    moveSensitivity: 1,
    shoot: null,
    bomb: null,
    switchWeapon: null,
    switchBomb: null,
    dash: null,
  }
  for (const [code, token] of Object.entries(map)) {
    const input = parseMouseBindCode(code)
    if (input === null) {
      continue
    }
    const action = tokenToBindAction(token)
    if (action && action !== 'up' && action !== 'down' && action !== 'left' && action !== 'right') {
      out[action] = input
    }
  }
  return out
}

function normalizeGamepadButtonIndex(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value)
  }
  return fallback
}

function gamepadFromBalance(): GamepadBindings {
  const gp = BALANCE.controls.gamepad
  const out: GamepadBindings = {
    invertMoveZ: gp.invertMoveZ,
    deadzone: gp.deadzone,
    axes: { moveX: gp.axes.moveX, moveZ: gp.axes.moveZ },
    pause: 9,
    shoot: 3,
    bomb: 0,
    switchWeapon: 2,
    switchBomb: 1,
    dash: 5,
  }
  for (const [index, token] of Object.entries(gp.buttons)) {
    if (token === 'Start') {
      out.pause = Number(index)
      continue
    }
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
      moveSensitivity: 1,
    },
    gamepad: gamepadFromBalance(),
    touch: touchFromBalance(),
  }
}

export function cloneInputBindings(source: InputBindings): InputBindings {
  return normalizeInputBindings({
    keyboard: { ...source.keyboard },
    mouse: { ...source.mouse },
    gamepad: {
      ...source.gamepad,
      axes: { ...source.gamepad.axes },
    },
    touch: { ...source.touch },
  })
}

function normalizeMouseBindInput(value: unknown): MouseBindInput {
  if (value === 'wheelUp' || value === 'wheelDown') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  return null
}

function normalizeKeyboardPauseCode(value: unknown): string | null {
  if (value === null || value === '') {
    return null
  }
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  return KEYBOARD_PAUSE_DEFAULT
}

function normalizeGamepadPauseIndex(value: unknown, fallback: number): number | null {
  if (value === null) {
    return null
  }
  return normalizeGamepadButtonIndex(value, fallback)
}

export function normalizeInputBindings(bindings: InputBindings): InputBindings {
  const mouse = bindings.mouse
  const keyboard = bindings.keyboard
  return {
    keyboard: {
      ...keyboard,
      pause: normalizeKeyboardPauseCode(keyboard.pause),
    },
    mouse: {
      moveEnabled: mouse.moveEnabled !== false,
      moveSensitivity: normalizeMouseSteerSensitivity(mouse.moveSensitivity),
      shoot: normalizeMouseBindInput(mouse.shoot),
      bomb: normalizeMouseBindInput(mouse.bomb),
      switchWeapon: normalizeMouseBindInput(mouse.switchWeapon),
      switchBomb: normalizeMouseBindInput(mouse.switchBomb),
      dash: normalizeMouseBindInput(mouse.dash),
    },
    gamepad: {
      ...bindings.gamepad,
      axes: { ...bindings.gamepad.axes },
      pause: normalizeGamepadPauseIndex(bindings.gamepad.pause, 9),
    },
    touch: { ...bindings.touch },
  }
}

export function copyInputBindings(source: InputBindings, target: InputBindings): void {
  Object.assign(target.keyboard, source.keyboard)
  target.mouse.moveEnabled = source.mouse.moveEnabled
  target.mouse.moveSensitivity = source.mouse.moveSensitivity
  Object.assign(target.mouse, source.mouse)
  target.gamepad.invertMoveZ = source.gamepad.invertMoveZ
  target.gamepad.deadzone = source.gamepad.deadzone
  target.gamepad.axes.moveX = source.gamepad.axes.moveX
  target.gamepad.axes.moveZ = source.gamepad.axes.moveZ
  target.gamepad.pause = source.gamepad.pause
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
  if (map.pause === code) {
    map.pause = previous
  }
  map[action] = code
}

export function assignKeyboardPause(bindings: InputBindings, code: string): void {
  const map = bindings.keyboard
  const previous = map.pause
  if (previous === code) {
    return
  }
  for (const action of BIND_ACTIONS) {
    if (map[action] === code) {
      if (previous !== null) {
        map[action] = previous
      }
    }
  }
  map.pause = code
}

export function assignMouseInput(
  bindings: InputBindings,
  action: MouseButtonAction,
  input: MouseBindInput,
): void {
  const previous = bindings.mouse[action]
  if (previous === input) {
    return
  }
  for (const key of MOUSE_BUTTON_ACTIONS) {
    if (key !== action && bindings.mouse[key] === input) {
      bindings.mouse[key] = previous
    }
  }
  bindings.mouse[action] = input
}

/** @deprecated Use assignMouseInput */
export function assignMouseButton(
  bindings: InputBindings,
  action: MouseButtonAction,
  button: number | null,
): void {
  assignMouseInput(bindings, action, button)
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
  if (map.pause !== null && map.pause === button) {
    map.pause = previous
  }
  map[action] = button
}

export function assignGamepadPause(bindings: InputBindings, button: number): void {
  const map = bindings.gamepad
  const previous = map.pause
  if (previous === button) {
    return
  }
  for (const action of MOUSE_BUTTON_ACTIONS) {
    if (map[action] === button) {
      if (previous !== null) {
        map[action] = previous
      }
    }
  }
  map.pause = button
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

export function isKeyboardPauseCode(bindings: KeyboardBindings, code: string): boolean {
  return bindings.pause !== null && bindings.pause === code
}

export function isKeyboardBoundCode(bindings: KeyboardBindings, code: string): boolean {
  if (isKeyboardPauseCode(bindings, code)) {
    return true
  }
  for (const action of BIND_ACTIONS) {
    if (bindings[action] === code) {
      return true
    }
  }
  return false
}

export function keyboardTokenFromCode(bindings: KeyboardBindings, code: string): VirtualToken | null {
  if (isKeyboardPauseCode(bindings, code)) {
    return PAUSE_VIRTUAL_TOKEN
  }
  for (const action of BIND_ACTIONS) {
    if (bindings[action] === code) {
      return BIND_ACTION_TO_TOKEN[action]
    }
  }
  return null
}

export function mouseTokenFromInput(bindings: MouseBindings, input: MouseBindInput): VirtualToken | null {
  if (input === null) {
    return null
  }
  for (const action of MOUSE_BUTTON_ACTIONS) {
    if (bindings[action] === input) {
      return BIND_ACTION_TO_TOKEN[action]
    }
  }
  return null
}

export function mouseTokenFromButton(bindings: MouseBindings, button: number): VirtualToken | null {
  return mouseTokenFromInput(bindings, button)
}

export function gamepadTokenFromButton(bindings: GamepadBindings, button: number): VirtualToken | null {
  if (bindings.pause !== null && bindings.pause === button) {
    return PAUSE_VIRTUAL_TOKEN
  }
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
  if (code === 'Escape') {
    return 'Esc'
  }
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

export function formatMouseInput(input: MouseBindInput): string {
  if (input === null) {
    return '—'
  }
  if (input === 'wheelUp') {
    return 'Wheel up'
  }
  if (input === 'wheelDown') {
    return 'Wheel down'
  }
  return formatMouseButton(input)
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

export function touchPauseVirtualToken(): VirtualToken {
  return PAUSE_VIRTUAL_TOKEN
}

export function formatKeyboardPauseBinding(bindings: KeyboardBindings): string {
  if (bindings.pause === null) {
    return '—'
  }
  return formatKeyCode(bindings.pause)
}

export function formatMouseBinding(bindings: MouseBindings, action: MouseButtonAction): string {
  return formatMouseInput(bindings[action])
}

export function formatGamepadBinding(bindings: GamepadBindings, action: MouseButtonAction): string {
  return formatGamepadButton(bindings[action])
}

export function formatGamepadPauseBinding(bindings: GamepadBindings): string {
  if (bindings.pause === null) {
    return '—'
  }
  return formatGamepadButton(bindings.pause)
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
