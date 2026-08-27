/**
 * Naming: .docs3/specs/equipment/EQP-01.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for EQP-01 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/equipment.spec.MD → EQP-01
 * Decision(s): D09 D10 D29
 * Tags       : tag_g_equipment tag_s_equip_item_schema tag_s_equip_mod_mul_grants
 * Priority   : must
 * Theme      : Theme 12 — Equipment (data contract; CHAR lookup)
 * Render     : N/A (Core catalog; Pause Balancer / /dev bind later)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Equip swap changes SPD/DEF/… predictably; no orphan stat keys on items"
 *
 * This file covers the **data structure** slice: exhaustive registries,
 * grant shape, Special/Generic items, orphan-field reject. Equip → Summary
 * recalc stays `it.todo` until CHAR-05.
 *
 * Golden Rule reminder (D07/D40): catalog is Core data — never Three/DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import {
//   BASE_SUM_FIELDS,
//   MODIFIER_FIELDS,
//   isRegisteredGrantField,
//   type SpecialEquipItem,
//   type GenericEquipItem,
// } from '../../../poc3/src/core/equipment/equipment';

const EXPECTED_BASE_SUM_FIELDS = [
  'agility',
  'deflection',
  'precision',
  'integrity',
  'shield',
  'energy',
] as const;

const EXPECTED_MODIFIER_FIELDS = [
  'agility_mod', 'agility_mul',
  'deflection_mod', 'deflection_mul',
  'precision_mod', 'precision_mul',
  'integrity_mod', 'integrity_mul',
  'shield_mod', 'shield_mul',
  'energy_mod', 'energy_mul',
  'speed_mod', 'speed_mul',
  'damage_mod', 'damage_mul',
  'shot_rate_mod', 'shot_rate_mul',
  'defense_mod', 'defense_mul',
  'lab_craft_time_mod', 'lab_craft_time_mul',
] as const;

describe('EQP-01 — Equip grants (data contract)', () => {
  beforeEach(() => {
    // arrange: empty EquipCatalog
  });

  it('exports 6 baseSum fields and 22 modifier fields (exhaustive)', () => {
    // given: BASE_SUM_FIELDS and MODIFIER_FIELDS
    // when: the constants are read
    // then: same sets as EXPECTED_* (22 modifiers = 6 primary + 4 derived + 1 lab, ×2)
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it('isRegisteredGrantField accepts registry keys and rejects orphans', () => {
    // given: isRegisteredGrantField
    // when: 'shield_mod' / 'agility' / 'damage' (orphan) / 'speed_base' (not an item grant)
    // then: true / true / false / false
    expect(true).toBe(false);
  });

  it('Special item requires specialSlot; Generic must not have specialSlot', () => {
    // given: catalog row kinds
    // when: a SpecialEquipItem and GenericEquipItem are constructed
    // then: special.kind === 'special' and specialSlot is a CHAR SpecialSlotId
    //       generic.kind === 'generic' and 'specialSlot' not in generic
    //       empty grants [] is valid on both
    expect(true).toBe(false);
  });

  it.todo('equipping a registered-grant item republishes Summary SPD/DEF/… (CHAR-05)');
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
