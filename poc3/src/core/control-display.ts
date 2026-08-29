import type { InputScheme } from './input-types.ts'
import {
  BIND_ACTION_LABELS,
  BIND_ACTION_TO_TOKEN,
  formatGamepadBinding,
  formatKeyboardBinding,
  formatMouseBinding,
  MOUSE_BUTTON_ACTIONS,
  TOUCH_SLOT_IDS,
  TOUCH_SLOT_LABELS,
  type BindAction,
  type InputBindings,
  type MouseButtonAction,
  type TouchSlotId,
} from './input-bindings.ts'
import type { VirtualToken } from './input-types.ts'

export interface ControlActionRow {
  readonly id: string
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

const ACTION_ROWS: readonly { readonly token: VirtualToken; readonly action: BindAction }[] = [
  { token: 'Up', action: 'up' },
  { token: 'Down', action: 'down' },
  { token: 'Left', action: 'left' },
  { token: 'Right', action: 'right' },
  { token: 'A', action: 'shoot' },
  { token: 'X', action: 'switchWeapon' },
  { token: 'B', action: 'bomb' },
  { token: 'Y', action: 'switchBomb' },
  { token: 'R1', action: 'dash' },
]

function formatParts(parts: readonly string[]): string {
  if (parts.length === 0) {
    return '—'
  }
  return parts.join(' · ')
}

function keyboardRow(bindings: InputBindings, action: BindAction): string {
  return formatKeyboardBinding(bindings.keyboard, action)
}

function mixMovementRow(bindings: InputBindings, action: BindAction): string {
  const parts: string[] = [formatKeyboardBinding(bindings.keyboard, action)]
  if (bindings.mouse.moveEnabled) {
    parts.push('Mouse move')
  }
  return formatParts(parts)
}

function mixRow(bindings: InputBindings, action: BindAction): string {
  if (MOVE_TOKENS.has(BIND_ACTION_TO_TOKEN[action])) {
    return mixMovementRow(bindings, action)
  }
  const parts: string[] = [formatKeyboardBinding(bindings.keyboard, action)]
  if (MOUSE_BUTTON_ACTIONS.includes(action as MouseButtonAction)) {
    const mouse = formatMouseBinding(bindings.mouse, action as MouseButtonAction)
    if (mouse !== '—') {
      parts.push(mouse)
    }
  }
  return formatParts(parts)
}

function gamepadRow(bindings: InputBindings, token: VirtualToken, action: BindAction): string {
  if (MOVE_TOKENS.has(token)) {
    return 'Left stick'
  }
  return formatGamepadBinding(bindings.gamepad, action as MouseButtonAction)
}

function touchRow(bindings: InputBindings, token: VirtualToken): string {
  if (MOVE_TOKENS.has(token)) {
    return 'Virtual stick'
  }
  const parts: string[] = []
  for (const slotId of TOUCH_SLOT_IDS) {
    if (BIND_ACTION_TO_TOKEN[bindings.touch[slotId]] === token) {
      parts.push(TOUCH_SLOT_LABELS[slotId])
    }
  }
  return formatParts(parts)
}

export function resolveControlBindings(
  scheme: InputScheme,
  bindings: InputBindings,
): ControlActionRow[] {
  return ACTION_ROWS.map((row) => {
    let binding: string
    switch (scheme) {
      case 'keyboard':
        binding = keyboardRow(bindings, row.action)
        break
      case 'mix':
        binding = mixRow(bindings, row.action)
        break
      case 'gamepad':
        binding = gamepadRow(bindings, row.token, row.action)
        break
      case 'touch':
        binding = touchRow(bindings, row.token)
        break
    }
    return {
      id: row.action,
      label: BIND_ACTION_LABELS[row.action],
      binding,
    }
  })
}

export function resolveTouchSlotRows(bindings: InputBindings): ControlActionRow[] {
  return TOUCH_SLOT_IDS.map((slotId) => ({
    id: slotId,
    label: TOUCH_SLOT_LABELS[slotId],
    binding: BIND_ACTION_LABELS[bindings.touch[slotId]],
  }))
}

export type { BindAction, MouseButtonAction, TouchSlotId }
