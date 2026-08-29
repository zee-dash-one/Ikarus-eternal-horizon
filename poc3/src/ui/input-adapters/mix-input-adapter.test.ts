/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { createDefaultInputBindings } from '../../core/input-bindings.ts'
import { MixInputAdapter } from './mix-input-adapter.ts'

describe('MixInputAdapter mouse steer', () => {
  it('clears steer axis immediately when moveEnabled is turned off', () => {
    const bindings = createDefaultInputBindings()
    bindings.mouse.moveEnabled = true
    const adapter = new MixInputAdapter(
      () => bindings.keyboard,
      () => bindings.mouse,
      () => true,
    )
    adapter.attach()
    document.dispatchEvent(new MouseEvent('mousemove', { movementX: 20, movementY: 0 }))
    expect(adapter.axis('moveX')).toBe(1)

    bindings.mouse.moveEnabled = false
    adapter.update()
    expect(adapter.axis('moveX')).toBe(0)
    expect(adapter.axis('moveZ')).toBe(0)

    adapter.detach()
  })
})

describe('MixInputAdapter held buttons', () => {
  it('keyup clears shoot while DOM capture is paused', () => {
    const bindings = createDefaultInputBindings()
    let captureDom = true
    const adapter = new MixInputAdapter(
      () => bindings.keyboard,
      () => bindings.mouse,
      () => captureDom,
    )
    adapter.attach()

    window.dispatchEvent(new KeyboardEvent('keydown', { code: bindings.keyboard.shoot, bubbles: true }))
    expect(adapter.isDown('A')).toBe(true)

    captureDom = false
    window.dispatchEvent(new KeyboardEvent('keyup', { code: bindings.keyboard.shoot, bubbles: true }))
    expect(adapter.isDown('A')).toBe(false)

    adapter.detach()
  })

  it('clearHeld drops stuck mouse fire', () => {
    const bindings = createDefaultInputBindings()
    const adapter = new MixInputAdapter(
      () => bindings.keyboard,
      () => bindings.mouse,
      () => true,
    )
    adapter.attach()

    window.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }))
    expect(adapter.isDown('A')).toBe(true)

    adapter.clearHeld()
    expect(adapter.isDown('A')).toBe(false)

    adapter.detach()
  })
})
