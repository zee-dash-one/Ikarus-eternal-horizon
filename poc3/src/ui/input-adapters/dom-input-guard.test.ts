/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import type { KeyboardBindings } from '../../core/input-bindings.ts'
import {
  isDomUiTarget,
  shouldCaptureKeyboardPress,
  shouldIgnoreDomPress,
  shouldIgnoreDomRelease,
} from './dom-input-guard.ts'

describe('dom-input-guard', () => {
  it('isDomUiTarget matches form controls and pause overlay', () => {
    const input = document.createElement('input')
    input.type = 'range'
    document.body.appendChild(input)
    expect(isDomUiTarget(input)).toBe(true)

    const overlay = document.createElement('div')
    overlay.id = 'pause-overlay'
    const child = document.createElement('span')
    overlay.appendChild(child)
    document.body.appendChild(overlay)
    expect(isDomUiTarget(child)).toBe(true)

    input.remove()
    overlay.remove()
  })

  it('shouldIgnoreDomPress when capture is off', () => {
    const canvas = document.createElement('canvas')
    expect(shouldIgnoreDomPress(canvas, false)).toBe(true)
    expect(shouldIgnoreDomPress(canvas, true)).toBe(false)
  })

  it('shouldIgnoreDomPress for UI targets even when capture is on', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    expect(shouldIgnoreDomPress(input, true)).toBe(true)
    input.remove()
  })

  it('shouldIgnoreDomRelease allows non-UI release while capture is off', () => {
    const canvas = document.createElement('canvas')
    expect(shouldIgnoreDomRelease(canvas)).toBe(false)
  })

  it('shouldIgnoreDomRelease blocks release on pause overlay controls', () => {
    const overlay = document.createElement('div')
    overlay.id = 'pause-overlay'
    const button = document.createElement('button')
    overlay.appendChild(button)
    document.body.appendChild(overlay)
    expect(shouldIgnoreDomRelease(button)).toBe(true)
    overlay.remove()
  })

  it('shouldCaptureKeyboardPress always accepts bound pause key', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const bindings = { pause: 'Escape' } as KeyboardBindings
    expect(shouldCaptureKeyboardPress(bindings, 'Escape', input, false)).toBe(true)
    expect(shouldCaptureKeyboardPress(bindings, 'KeyW', input, false)).toBe(false)
    bindings.pause = null
    expect(shouldCaptureKeyboardPress(bindings, 'Escape', input, false)).toBe(false)
    input.remove()
  })
})
