import { describe, expect, it } from 'vitest'
import { InputBindingsManager } from '../systems/input-bindings-manager.ts'
import { GameUiController } from '../ui/game-ui-controller.ts'

describe('mouse sensitivity ui', () => {
  it('setMouseMoveSensitivity on controller updates controlBindings', () => {
    const ui = new GameUiController()
    ui.setMouseMoveSensitivity(2.5)
    expect(ui.controlBindings.mouse.moveSensitivity).toBe(2.5)
    ui.setMouseMoveSensitivity(4)
    expect(ui.controlBindings.mouse.moveSensitivity).toBe(4)
  })

  it('syncControlBindings mirrors manager moveSensitivity', () => {
    const mgr = new InputBindingsManager()
    const ui = new GameUiController()
    mgr.setMouseMoveSensitivity(3.25)
    ui.syncControlBindings(mgr.bindings)
    expect(ui.controlBindings.mouse.moveSensitivity).toBe(3.25)
  })
})
