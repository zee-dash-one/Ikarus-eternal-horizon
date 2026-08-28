import { describe, expect, it } from 'vitest'
import { resolveControlBindings } from './control-display.ts'

describe('resolveControlBindings', () => {
  it('keyboard shows WASD movement and combat keys', () => {
    const rows = resolveControlBindings('keyboard')
    expect(rows.find((r) => r.label === 'Up')?.binding).toBe('W')
    expect(rows.find((r) => r.label === 'Shoot')?.binding).toBe('F')
    expect(rows.find((r) => r.label === 'Dash')?.binding).toBe('Space')
  })

  it('mix adds mouse bindings alongside keyboard', () => {
    const rows = resolveControlBindings('mix')
    const shoot = rows.find((r) => r.label === 'Shoot')?.binding ?? ''
    expect(shoot).toContain('F')
    expect(shoot).toContain('Left click')
  })

  it('gamepad uses left stick for movement', () => {
    const rows = resolveControlBindings('gamepad')
    expect(rows.find((r) => r.label === 'Left')?.binding).toBe('Left stick')
    expect(rows.find((r) => r.label === 'Shoot')?.binding).toBe('Y')
  })

  it('touch maps on-screen slots', () => {
    const rows = resolveControlBindings('touch')
    expect(rows.find((r) => r.label === 'Up')?.binding).toBe('Virtual stick')
    expect(rows.find((r) => r.label === 'Bomb')?.binding).toBe('Bomb button')
  })
})
