/**
 * Naming: .docs3/specs/equipment/EQP-02.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for EQP-02 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/equipment.spec.MD → EQP-02
 * Decision(s): D29
 * Tags       : tag_g_equipment tag_s_equip_contextual_mods
 * Priority   : must
 * Theme      : Theme 4 / 12 — contextual grants (data contract first)
 * Render     : N/A (Core types; PlayerManager dash toggle later)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Dash item can raise deflection only while dashing; revert on dash end"
 *
 * This file covers the **data structure** slice: GrantContext union and
 * omitted-when = always. Dash/shield/integrity toggle behaviour stays
 * `it.todo` until PlayerManager + CHAR-05 context patch exist.
 *
 * Golden Rule reminder (D07/D40): context patch writes Summary via
 * CharSheetManager — never Full Sheet rewrite, never Three/DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import { GRANT_CONTEXTS } from '../../../poc3/src/core/equipment/equipment';

const EXPECTED_GRANT_CONTEXTS = [
  'dashing',
  'shield_empty',
  'integrity_severe',
] as const;

describe('EQP-02 — Contextual grants (data contract)', () => {
  beforeEach(() => {
    // arrange: grant objects with and without `when`
  });

  it('GRANT_CONTEXTS is exactly dashing | shield_empty | integrity_severe', () => {
    // given: GRANT_CONTEXTS
    // when: the constant is read
    // then: same set/order as EXPECTED_GRANT_CONTEXTS
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it('omitted when means always; unknown when is rejected', () => {
    // given: EquipGrant { field: 'deflection_mod', value: 1 }
    //        EquipGrant { field: 'deflection_mod', value: 1, when: 'stealth' }
    // when: catalog validation runs
    // then: omitted `when` is valid; 'stealth' is invalid
    expect(true).toBe(false);
  });

  it.todo('dashing grant raises deflection only while dash is active; reverts on dash end');

  it.todo('contextual grant does not rewrite stored Full Sheet equip totals');
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
