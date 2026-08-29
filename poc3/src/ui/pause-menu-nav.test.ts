/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import {
  focusPauseExit,
  getPauseFocusables,
  isPauseExitFocused,
  movePauseFocus,
  PauseMenuNavigator,
  shouldUseArrowNav,
} from './pause-menu-nav.ts'
import { setRemapListening } from './remap-listen-state.ts'

describe('pause-menu-nav', () => {
  it('lists visible focusable controls inside pause overlay', () => {
    const root = document.createElement('div')
    root.id = 'pause-overlay'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = 'Exit'
    const hidden = document.createElement('button')
    hidden.type = 'button'
    hidden.hidden = true
    root.append(btn, hidden)
    document.body.append(root)

    const items = getPauseFocusables(root)
    expect(items).toHaveLength(1)
    expect(items[0]).toBe(btn)

    root.remove()
  })

  it('shouldUseArrowNav skips range and number inputs', () => {
    const range = document.createElement('input')
    range.type = 'range'
    const number = document.createElement('input')
    number.type = 'number'
    const button = document.createElement('button')

    expect(shouldUseArrowNav(range)).toBe(false)
    expect(shouldUseArrowNav(number)).toBe(false)
    expect(shouldUseArrowNav(button)).toBe(true)
  })

  it('movePauseFocus cycles with arrow navigation', () => {
    const root = document.createElement('div')
    const a = document.createElement('button')
    a.type = 'button'
    const b = document.createElement('button')
    b.type = 'button'
    root.append(a, b)
    document.body.append(root)

    a.focus()
    movePauseFocus(root, 1)
    expect(document.activeElement).toBe(b)

    movePauseFocus(root, 1)
    expect(document.activeElement).toBe(a)

    root.remove()
  })

  it('focusPauseExit targets pause-exit button', () => {
    const root = document.createElement('div')
    const exit = document.createElement('button')
    exit.type = 'button'
    exit.id = 'pause-exit'
    root.append(exit)
    document.body.append(root)

    focusPauseExit(root)
    expect(document.activeElement).toBe(exit)
    expect(isPauseExitFocused(root)).toBe(true)

    root.remove()
  })

  it('Enter focuses exit then activates on second press', () => {
    const root = document.createElement('div')
    const exit = document.createElement('button')
    exit.type = 'button'
    exit.id = 'pause-exit'
    let clicks = 0
    exit.addEventListener('click', () => {
      clicks += 1
    })
    root.append(exit)
    document.body.append(root)

    const nav = new PauseMenuNavigator()
    nav.attach(root)

    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    expect(document.activeElement).toBe(exit)
    expect(clicks).toBe(0)

    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    expect(clicks).toBe(1)

    nav.detach()
    root.remove()
  })

  it('pollGamepad returns immediately while remap listener is active', () => {
    const getGamepads = vi.fn(() => [])
    vi.stubGlobal('navigator', { getGamepads })

    setRemapListening(true)
    const nav = new PauseMenuNavigator()
    nav.attach(document.createElement('div'))
    nav.pollGamepad()

    expect(getGamepads).not.toHaveBeenCalled()

    setRemapListening(false)
    vi.unstubAllGlobals()
    nav.detach()
  })
})
