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
import { CharSheetManager } from '../../../poc3/src/systems/char-sheet-manager.ts';

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
  let mgr: CharSheetManager;

  beforeEach(() => {
    mgr = CharSheetManager.create();
  });

  it('empty Summary publishes all locked codes plus integrityState', () => {
    const summary = mgr.summary;
    for (const code of SUMMARY_CODES) {
      expect(typeof summary[code]).toBe('number');
    }
    expect(summary.integrityState).toBe('LIGHT');
    expect(summary.LVL).toBe(1);
  });

  it('MIT is a stored Summary field (not derived at read time)', () => {
    const summary = mgr.summary;
    expect(typeof summary.MIT).toBe('number');
    expect(summary.MIT).toBe(summary.DEF / 10);
  });

  it('CharSheetManager.summary exposes required runtime fields', () => {
    const summary = mgr.summary;
    for (const key of ['ENE', 'SHD', 'DEF', 'MIT', 'SPD'] as const) {
      expect(summary[key]).toBeDefined();
      expect(typeof summary[key]).toBe('number');
    }
    expect(summary.integrityState).toBeDefined();
    expect(mgr.full).toBeDefined();
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
