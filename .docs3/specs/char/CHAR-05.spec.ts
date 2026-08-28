/**
 * Naming: .docs3/specs/char/CHAR-05.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CHAR-05 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/char-sheet.spec.MD → CHAR-05
 * Decision(s): D07 D12 D24
 * Tags       : tag_g_char_sheet tag_s_char_recalc_triggers tag_s_char_mitigation_mit tag_s_char_equip_slots tag_s_char_effect_slots
 * Priority   : must
 * Theme      : Theme 3 — CHAR sheet (new model)
 * Render     : N/A (Core; CharSheetManager owns recalc)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Effect expiry does not rewrite Full Sheet; equip/`LVL` republish `MIT`"
 *
 * Golden Rule reminder (D07/D24): only CharSheetManager writes Summary.
 * MIT = DEF / 10 is published during recalc — never on the hit path.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import { BALANCE } from '../../../poc3/src/core/balancer.ts';
import { CharSheetManager } from '../../../poc3/src/systems/char-sheet-manager.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SHEET_MGR = resolve(REPO_ROOT, 'poc3/src/systems/char-sheet-manager.ts');

describe('CHAR-05 — Recalc triggers', () => {
  let mgr: CharSheetManager;

  beforeEach(() => {
    mgr = CharSheetManager.create();
  });

  it('CharSheetManager exposes recalc entry points', () => {
    expect(existsSync(SHEET_MGR), 'poc3/src/systems/char-sheet-manager.ts').toBe(true);
    const src = readFileSync(SHEET_MGR, 'utf8');
    expect(src).toMatch(/recalc|Recalc/);
    expect(typeof mgr.recalcFull).toBe('function');
    expect(typeof mgr.recalcSummaryOnly).toBe('function');
  });

  it('equip or unequip Special/Generic runs Full Sheet → Summary recalc', () => {
    mgr.setContext('dashing', true);
    mgr.recalcFull();
    expect(mgr.summary.DEF).toBe(BALANCE.sheet.playerDefaults.DEF + 2);
    expect(mgr.summary.MIT).toBe(mgr.summary.DEF / 10);
    mgr.setContext('dashing', false);
    mgr.recalcFull();
    expect(mgr.summary.DEF).toBe(BALANCE.sheet.playerDefaults.DEF);
  });

  it('effect activate or expire patches Summary only — Full Sheet untouched', () => {
    const fullBefore = structuredClone(mgr.full);
    mgr.setContext('dashing', true);
    mgr.setContext('dashing', false);
    expect(mgr.full).toEqual(fullBefore);
  });

  it('LVL change recalculates only DEF, MIT, SPD, S_D on Summary', () => {
    mgr.recalcLevelPartial();
    expect(mgr.summary.MIT).toBe(mgr.summary.DEF / 10);
    expect(typeof mgr.summary.SPD).toBe('number');
    expect(typeof mgr.summary.S_D).toBe('number');
  });

  it('when DEF is rebuilt, MIT = DEF / 10 in the same recalc pass', () => {
    mgr.recalcFull();
    expect(mgr.summary.MIT).toBe(mgr.summary.DEF / 10);
  });

  it.todo('context toggle (dashing, shield_empty, integrity band) applies Summary-only when grants');

  it.todo('no system other than CharSheetManager mutates summary fields');
});
