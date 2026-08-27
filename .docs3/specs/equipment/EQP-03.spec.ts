/**
 * Naming: .docs3/specs/equipment/EQP-03.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for EQP-03 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/equipment.spec.MD → EQP-03
 * Decision(s): D29 D31
 * Tags       : tag_g_equipment tag_s_equip_lab_craft_mods
 * Priority   : should
 * Theme      : Theme 12 — lab craft time (data contract first)
 * Render     : N/A (Full Sheet field; Pause Lab read later)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Equipped lab module reduces craft timer"
 *
 * This file covers the **data structure** slice: lab_craft_time_* sit on
 * the modifier registry and on Full Sheet only (not Summary). Craft-start
 * read stays `it.todo` until CraftManager exists.
 *
 * Golden Rule reminder (D07/D40): combat frame must not read labCraftTime.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import { MODIFIER_FIELDS } from '../../../poc3/src/core/equipment/equipment';
// import { createEmptyCharSheet } from '../../../poc3/src/core/sheet/char-sheet';

describe('EQP-03 — Lab craft time modifiers (data contract)', () => {
  beforeEach(() => {
    // arrange: empty sheet + catalog with lab_craft_time_mul grant
  });

  it('lab_craft_time_mod and lab_craft_time_mul are registered modifier fields', () => {
    // given: MODIFIER_FIELDS
    // when: membership is checked
    // then: both keys are present
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it('labCraftTime lives on Full Sheet, not Summary', () => {
    // given: createEmptyCharSheet()
    // when: full.labCraftTime and summary keys are inspected
    // then: full.labCraftTime is { mod: 0, mul: 1 }
    //       summary has no labCraftTime / lab_craft_time_* keys
    expect(true).toBe(false);
  });

  it.todo('CraftManager reads lab_craft_time_* only when a craft starts (not per combat frame)');
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
