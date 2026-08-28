import { describe, it, expect } from 'vitest'
import {
  GRANT_CONTEXTS,
} from '../../../poc3/src/core/sheet/char-sheet.ts'
import { validateEquipGrant } from '../../../poc3/src/core/equipment/equipment.ts'

const EXPECTED_GRANT_CONTEXTS = [
  'dashing',
  'shield_empty',
  'integrity_severe',
] as const

describe('EQP-02 — Contextual grants (data contract)', () => {
  it('GRANT_CONTEXTS is exactly dashing | shield_empty | integrity_severe', () => {
    expect(GRANT_CONTEXTS).toEqual(EXPECTED_GRANT_CONTEXTS)
  })

  it('omitted when means always; unknown when is rejected', () => {
    expect(validateEquipGrant({ field: 'deflection_mod', value: 1 })).toBe(true)
    expect(
      validateEquipGrant({ field: 'deflection_mod', value: 1, when: 'stealth' }),
    ).toBe(false)
  })

  it.todo('dashing grant raises deflection only while dash is active; reverts on dash end')

  it.todo('contextual grant does not rewrite stored Full Sheet equip totals')
})
