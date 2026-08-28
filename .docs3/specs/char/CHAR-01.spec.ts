import { describe, it, expect } from 'vitest'
import {
  SPECIAL_SLOT_IDS,
  SPECIAL_SLOT_COUNT,
  GENERIC_SLOT_COUNT,
  EFFECT_SLOT_COUNT,
  CHAR_SLOT_COUNT,
  createEmptyCharSheet,
} from '../../../poc3/src/core/sheet/char-sheet.ts'

const EXPECTED_SPECIAL_SLOT_IDS = [
  'Primary_Weapon',
  'Secondary_Weapon',
  'Dash',
  'Bomb',
  'Wings',
  'Shield',
  'Armor',
  'Rockets',
  'Engine',
  'Collector',
  'Converter',
  'Lab',
] as const

describe('CHAR-01 — Equip slots (data contract)', () => {
  it('exports exactly 12 Special slot ids in locked order', () => {
    expect(SPECIAL_SLOT_IDS).toEqual(EXPECTED_SPECIAL_SLOT_IDS)
    expect(SPECIAL_SLOT_COUNT).toBe(12)
  })

  it('empty craft exposes 12 Special + 21 Generic + 21 Effect occupants', () => {
    const full = createEmptyCharSheet()
    expect(Object.keys(full.special).length).toBe(12)
    expect(full.generic.length).toBe(21)
    expect(full.effects.length).toBe(21)
    expect(SPECIAL_SLOT_COUNT + GENERIC_SLOT_COUNT + EFFECT_SLOT_COUNT).toBe(
      CHAR_SLOT_COUNT,
    )
    expect(CHAR_SLOT_COUNT).toBe(54)
  })

  it('every Special key is present even when all itemId are null', () => {
    const full = createEmptyCharSheet()
    for (const id of EXPECTED_SPECIAL_SLOT_IDS) {
      expect(full.special[id].itemId).toBeNull()
    }
  })

  it.todo('Special item is rejected when the target Special key does not match its type')

  it.todo('Effect activate is blocked when all 21 Effect slots are occupied (unless explicit replace)')
})
