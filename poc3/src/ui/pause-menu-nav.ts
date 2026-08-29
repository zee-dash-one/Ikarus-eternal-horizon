import { isRemapListening } from './remap-listen-state.ts'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

const GAMEPAD_DEADZONE = 0.45
const GAMEPAD_REPEAT_MS = 160
/** BALANCE.controls.gamepad.buttons — X focuses Exit */
const GAMEPAD_EXIT_FOCUS_BTN = 2
/** Y or X confirms Exit when focused */
const GAMEPAD_EXIT_CONFIRM_BTNS = [1, 2] as const
const PAUSE_EXIT_ID = 'pause-exit'

export function getPauseFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.hidden) {
      return false
    }
    if (el.closest('[hidden]')) {
      return false
    }
    if (typeof el.checkVisibility === 'function') {
      return el.checkVisibility()
    }
    return true
  })
}

export function getPauseExitButton(root: HTMLElement): HTMLElement | null {
  const exit = root.querySelector<HTMLElement>(`#${PAUSE_EXIT_ID}`)
  return exit instanceof HTMLElement ? exit : null
}

/** Arrow keys move focus; leave range/number/text inputs to native behavior. */
export function shouldUseArrowNav(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) {
    return true
  }
  if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
    return false
  }
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return type !== 'range' && type !== 'number' && type !== 'text' && type !== 'email' && type !== 'search'
  }
  return true
}

export function movePauseFocus(root: HTMLElement, delta: number): void {
  const items = getPauseFocusables(root)
  if (items.length === 0) {
    return
  }
  const active = document.activeElement
  let index = active instanceof HTMLElement ? items.indexOf(active) : -1
  if (index < 0) {
    items[0].focus()
    items[0].scrollIntoView?.({ block: 'nearest' })
    return
  }
  index = (index + delta + items.length) % items.length
  const next = items[index]
  next.focus()
  next.scrollIntoView?.({ block: 'nearest' })
}

export function focusPauseExit(root: HTMLElement): void {
  const exit = getPauseExitButton(root)
  if (!exit) {
    return
  }
  exit.focus()
  exit.scrollIntoView?.({ block: 'nearest' })
}

export function activatePauseExit(root: HTMLElement): void {
  const exit = getPauseExitButton(root)
  exit?.click()
}

export function isPauseExitFocused(root: HTMLElement): boolean {
  const exit = getPauseExitButton(root)
  return exit !== null && document.activeElement === exit
}

type MenuDirection = 'up' | 'down' | 'left' | 'right'

function readGamepadDirection(pad: Gamepad): MenuDirection | null {
  if (pad.buttons[12]?.pressed) {
    return 'up'
  }
  if (pad.buttons[13]?.pressed) {
    return 'down'
  }
  if (pad.buttons[14]?.pressed) {
    return 'left'
  }
  if (pad.buttons[15]?.pressed) {
    return 'right'
  }
  const x = pad.axes[0] ?? 0
  const y = pad.axes[1] ?? 0
  if (Math.abs(x) < GAMEPAD_DEADZONE && Math.abs(y) < GAMEPAD_DEADZONE) {
    return null
  }
  if (Math.abs(x) >= Math.abs(y)) {
    return x < 0 ? 'left' : 'right'
  }
  return y < 0 ? 'up' : 'down'
}

function directionDelta(dir: MenuDirection): number {
  return dir === 'up' || dir === 'left' ? -1 : 1
}

function isGamepadButtonDown(button: GamepadButton | undefined): boolean {
  if (!button) {
    return false
  }
  return button.pressed || button.value >= 0.35
}

export class PauseMenuNavigator {
  private _root: HTMLElement | null = null
  private _onKeyDown: ((e: KeyboardEvent) => void) | null = null
  private _activeDir: MenuDirection | null = null
  private _lastMoveMs = 0
  private _exitFocusHeld = false
  private _exitConfirmHeld = new Set<number>()

  attach(root: HTMLElement): void {
    this.detach()
    this._root = root
    this._onKeyDown = (e: KeyboardEvent): void => {
      if (isRemapListening()) {
        return
      }
      if (!root.contains(e.target as Node)) {
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (isPauseExitFocused(root)) {
          activatePauseExit(root)
        } else {
          focusPauseExit(root)
        }
        return
      }
      if (!ARROW_KEYS.has(e.key)) {
        return
      }
      if (!shouldUseArrowNav(e.target instanceof Element ? e.target : null)) {
        return
      }
      e.preventDefault()
      const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1
      movePauseFocus(root, delta)
    }
    root.addEventListener('keydown', this._onKeyDown)
    requestAnimationFrame(() => {
      const items = getPauseFocusables(root)
      const first = items[0]
      if (first) {
        first.focus()
      }
    })
  }

  detach(): void {
    if (this._root && this._onKeyDown) {
      this._root.removeEventListener('keydown', this._onKeyDown)
    }
    this._root = null
    this._onKeyDown = null
    this._activeDir = null
    this._exitFocusHeld = false
    this._exitConfirmHeld.clear()
    this._lastMoveMs = 0
  }

  pollGamepad(): void {
    if (isRemapListening()) {
      return
    }
    const root = this._root
    if (!root) {
      return
    }
    const pad = navigator.getGamepads?.()?.[0]
    if (!pad) {
      this._activeDir = null
      this._exitFocusHeld = false
      this._exitConfirmHeld.clear()
      return
    }

    const dir = readGamepadDirection(pad)
    const now = performance.now()
    if (dir) {
      const edge = dir !== this._activeDir
      if (edge || now - this._lastMoveMs >= GAMEPAD_REPEAT_MS) {
        movePauseFocus(root, directionDelta(dir))
        this._lastMoveMs = now
      }
      this._activeDir = dir
    } else {
      this._activeDir = null
    }

    const focusDown = isGamepadButtonDown(pad.buttons[GAMEPAD_EXIT_FOCUS_BTN])
    if (focusDown && !this._exitFocusHeld) {
      if (!isPauseExitFocused(root)) {
        focusPauseExit(root)
      } else {
        activatePauseExit(root)
      }
    }
    this._exitFocusHeld = focusDown

    for (const index of GAMEPAD_EXIT_CONFIRM_BTNS) {
      const down = isGamepadButtonDown(pad.buttons[index])
      if (down && !this._exitConfirmHeld.has(index)) {
        if (isPauseExitFocused(root)) {
          activatePauseExit(root)
        }
      }
      if (down) {
        this._exitConfirmHeld.add(index)
      } else {
        this._exitConfirmHeld.delete(index)
      }
    }
  }
}

export const pauseMenuNav = new PauseMenuNavigator()
