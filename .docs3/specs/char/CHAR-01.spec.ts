/**
 * Naming: .docs3/specs/char/CHAR-01.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CHAR-01 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/char-sheet.spec.MD → CHAR-01
 * Decision(s): D08
 * Tags       : tag_g_char_sheet tag_s_char_equip_slots
 * Priority   : must
 * Theme      : Theme 3 — CHAR sheet (data contract)
 * Render     : N/A (Core types; Pause Balancer binds later · SCENE-05)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Instance always exposes the full slot set"
 *
 * This file covers the **data structure** slice: 12 Special + 21 Generic +
 * 21 Effect occupants always present, including when empty. Equip type-gate
 * behaviour stays `it.todo` until CharSheetManager equip APIs land.
 *
 * Golden Rule reminder (D07/D40): types live in core/sheet — never Three/DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import {
//   SPECIAL_SLOT_IDS,
//   SPECIAL_SLOT_COUNT,
//   GENERIC_SLOT_COUNT,
//   EFFECT_SLOT_COUNT,
//   CHAR_SLOT_COUNT,
//   createEmptyCharSheet,
// } from '../../../poc3/src/core/sheet/char-sheet';

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
] as const;

describe('CHAR-01 — Equip slots (data contract)', () => {
  beforeEach(() => {
    // arrange: empty CharSheet from CharSheetManager.create / createEmptyCharSheet
  });

  it('exports exactly 12 Special slot ids in locked order', () => {
    // given: SPECIAL_SLOT_IDS from core/sheet
    // when: the constant is read
    // then: length 12 and same set/order as EXPECTED_SPECIAL_SLOT_IDS
    //       (Converter, not Conversor)
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it('empty craft exposes 12 Special + 21 Generic + 21 Effect occupants', () => {
    // given: createEmptyCharSheet()
    // when: slot collections are counted
    // then: Object.keys(full.special).length === 12
    //       full.generic.length === 21
    //       full.effects.length === 21
    //       SPECIAL_SLOT_COUNT + GENERIC_SLOT_COUNT + EFFECT_SLOT_COUNT === CHAR_SLOT_COUNT === 54
    expect(true).toBe(false);
  });

  it('every Special key is present even when all itemId are null', () => {
    // given: empty craft
    // when: each EXPECTED_SPECIAL_SLOT_IDS entry is read
    // then: occupant exists and itemId === null
    expect(true).toBe(false);
  });

  it.todo('Special item is rejected when the target Special key does not match its type');

  it.todo('Effect activate is blocked when all 21 Effect slots are occupied (unless explicit replace)');
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
