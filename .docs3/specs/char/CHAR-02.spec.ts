/**
 * Naming: .docs3/specs/char/CHAR-02.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CHAR-02 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/char-sheet.spec.MD → CHAR-02
 * Decision(s): D09 D10 D11
 * Tags       : tag_g_char_sheet tag_s_char_full_sheet_families tag_s_char_effect_slots
 * Priority   : must
 * Theme      : Theme 3 — CHAR sheet (data contract)
 * Render     : N/A (Core types; Pause Balancer binds later · SCENE-05)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Item equip changes published Summary after recalc"
 *
 * This file covers the **data structure** slice first: Full Sheet family
 * objects exist with locked field names and empty-craft identities
 * (mod 0, mul 1). Equip → recalc behaviour stays `it.todo` until CHAR-05.
 *
 * Golden Rule reminder (D07/D40): Full Sheet is never read by frame systems.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultSummary } from '../../../poc3/src/core/sheet/char-sheet.ts';
import { BALANCE } from '../../../poc3/src/core/balancer.ts';
import { CharSheetManager } from '../../../poc3/src/systems/char-sheet-manager.ts';

describe('CHAR-02 — Full Sheet families (data contract)', () => {
  beforeEach(() => {
    // arrange: empty CharSheet
  });

  it('createDefaultSummary publishes MIT = DEF / 10', () => {
    const summary = createDefaultSummary();
    expect(summary.MIT).toBe(summary.DEF / 10);
  });

  it('CharSheetManager.create recalc publishes MIT = DEF / 10', () => {
    const mgr = CharSheetManager.create();
    expect(mgr.summary.MIT).toBe(mgr.summary.DEF / 10);
  });

  it('context grant that bumps DEF republishes MIT on recalcSummaryOnly', () => {
    const mgr = CharSheetManager.create();
    mgr.setContext('dashing', true);
    mgr.recalcFull();
    expect(mgr.summary.DEF).toBeGreaterThan(BALANCE.sheet.playerDefaults.DEF);
    expect(mgr.summary.MIT).toBe(mgr.summary.DEF / 10);
    mgr.recalcSummaryOnly();
    expect(mgr.summary.MIT).toBe(mgr.summary.DEF / 10);
  });

  it.todo('equipping an item with family grants updates Full Sheet then publishes Summary (CHAR-05)');
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
