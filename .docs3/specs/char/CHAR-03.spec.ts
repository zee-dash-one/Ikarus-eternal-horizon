/**
 * Naming: .docs3/specs/char/CHAR-03.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CHAR-03 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/char-sheet.spec.MD → CHAR-03
 * Decision(s): D07 D24
 * Tags       : tag_g_char_sheet tag_s_char_summary_sheet tag_s_char_mitigation_mit tag_s_char_integrity_states
 * Priority   : must
 * Theme      : Theme 3 — CHAR sheet (data contract)
 * Render     : N/A (Core types; HUD later · HUD-01)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Frame systems never read Full Sheet; never recompute DEF/10 on hit"
 *
 * This file covers the **data structure** slice: SummarySheet publishes the
 * locked codes plus integrityState; MIT is a stored field. Frame-loop
 * isolation and hit-path guards stay `it.todo` until systems exist.
 *
 * Golden Rule reminder (D07/D40): tests below must prove only Summary Sheet
 * is the runtime read model — never Full Sheet on the hot path.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import { createEmptyCharSheet } from '../../../poc3/src/core/sheet/char-sheet';

const SUMMARY_CODES = [
  'ENE',
  'SHD',
  'DEF',
  'MIT',
  'SPD',
  'S_D',
  'S_R',
  'REG',
  'LVL',
  'HP',
] as const;

describe('CHAR-03 — Summary Sheet (data contract)', () => {
  beforeEach(() => {
    // arrange: empty CharSheet
  });

  it('empty Summary publishes all locked codes plus integrityState', () => {
    // given: createEmptyCharSheet().summary
    // when: keys are listed
    // then: every SUMMARY_CODES entry exists as a number
    //       integrityState === 'LIGHT'
    //       LVL === 1; all other numeric codes === 0
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it('MIT is a stored Summary field (not derived at read time)', () => {
    // given: empty summary
    // when: MIT is read
    // then: typeof MIT === 'number' and MIT === 0
    //       writing DEF must not auto-change MIT (only CHAR-05 recalc does)
    expect(true).toBe(false);
  });

  it('CharSheet exposes full and summary as sibling layers', () => {
    // given: createEmptyCharSheet()
    // when: the instance is inspected
    // then: sheet.full and sheet.summary are both present
    //       frame-facing type SummarySheet has no primary-family keys
    expect(true).toBe(false);
  });

  it.todo('frame systems never read Full Sheet fields on the hot path');

  it.todo('hit path never recomputes DEF/10 — it subtracts published MIT (CHAR-06)');
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
