import { BALANCE } from './balancer.ts'
import type { InputScheme, VirtualToken } from './input-types.ts'

export interface ControlActionRow {
  readonly label: string
  readonly binding: string
}

export const CONTROL_SCHEME_OPTIONS: readonly { readonly id: InputScheme; readonly label: string }[] = [
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'mix', label: 'Keyboard + Mouse' },
  { id: 'gamepad', label: 'Gamepad' },
  { id: 'touch', label: 'Touch' },
]

const MOVE_TOKENS = new Set<VirtualToken>(['Up', 'Down', 'Left', 'Right'])

const ACTION_ROWS: readonly { readonly token: VirtualToken; readonly label: string }[] = [
  { token: 'Up', label: 'Up' },
  { token: 'Down', label: 'Down' },
  { token: 'Left', label: 'Left' },
  { token: 'Right', label: 'Right' },
  { token: 'A', label: 'Shoot' },
  { token: 'X', label: 'Switch Weapon' },
  { token: 'B', label: 'Bomb' },
  { token: 'Y', label: 'Switch Bomb' },
  { token: 'R1', label: 'Dash' },
]

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

const TOUCH_SLOT_LABELS: Record<string, string> = {
  fire: 'Fire button',
  bomb: 'Bomb button',
  switchWeapon: 'Switch weapon button',
  switchBomb: 'Switch bomb button',
  dash: 'Dash button',
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

function formatBindings(parts: readonly string[]): string {
  if (parts.length === 0) {
    return '—'
  }
  return parts.join(' · ')
}

function bindingsFromTokenMap(
  map: Readonly<Record<string, string>>,
  token: VirtualToken,
): string[] {
  const parts: string[] = []
  for (const [key, mapped] of Object.entries(map)) {
    if (mapped !== token) {
      continue
    }
    if (key.startsWith('Mouse')) {
      const button = Number(key.slice(5))
      if (Number.isFinite(button)) {
        parts.push(formatMouseButton(button))
      }
      continue
    }
    parts.push(formatKeyCode(key))
  }
  return parts
}

function keyboardBindings(token: VirtualToken): string {
  return formatBindings(bindingsFromTokenMap(BALANCE.controls.keyboard, token))
}

function mixBindings(token: VirtualToken): string {
  return formatBindings(bindingsFromTokenMap(BALANCE.controls.mix, token))
}

function gamepadBindings(token: VirtualToken): string {
  if (MOVE_TOKENS.has(token)) {
    return 'Left stick'
  }
  const parts: string[] = []
  for (const [index, mapped] of Object.entries(BALANCE.controls.gamepad.buttons)) {
    if (mapped !== token) {
      continue
    }
    parts.push(formatGamepadButton(Number(index)))
  }
  return formatBindings(parts)
}

function touchBindings(token: VirtualToken): string {
  if (MOVE_TOKENS.has(token)) {
    return 'Virtual stick'
  }
  const parts: string[] = []
  for (const [slot, mapped] of Object.entries(BALANCE.controls.touch.slots)) {
    if (mapped !== token) {
      continue
    }
    parts.push(TOUCH_SLOT_LABELS[slot] ?? slot)
  }
  return formatBindings(parts)
}

export function resolveControlBindings(scheme: InputScheme): ControlActionRow[] {
  const resolve = (token: VirtualToken): string => {
    switch (scheme) {
      case 'keyboard':
        return keyboardBindings(token)
      case 'mix':
        return mixBindings(token)
      case 'gamepad':
        return gamepadBindings(token)
      case 'touch':
        return touchBindings(token)
    }
  }

  return ACTION_ROWS.map((row) => ({
    label: row.label,
    binding: resolve(row.token),
  }))
}
