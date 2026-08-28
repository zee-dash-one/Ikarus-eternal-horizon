/**
 * Naming: .docs3/specs/char/CHAR-06.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CHAR-06 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/char-sheet.spec.MD → CHAR-06
 * Decision(s): D13 D14 D24
 * Tags       : tag_g_combat tag_s_combat_damage_apply tag_s_char_mitigation_mit tag_s_combat_shield_absorb tag_s_combat_collision_layers tag_s_combat_ship_collision_exchange
 * Priority   : must
 * Theme      : Theme 3 — CHAR sheet (new model)
 * Render     : N/A (Core; DamageManager sole applyDamage path)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Shield absorbs before Integrity; no per-hit DEF math"
 *
 * Golden Rule reminder (D24): DamageManager reads published MIT from Summary.
 * It must never evaluate DEF / 10 during applyDamage.
 *
 * Theme 5 reuse: DamageManager integration also covered in CHAR-06-combat.spec.ts.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach } from 'vitest';
import type { SummarySheet } from '../../../poc3/src/core/sheet/char-sheet.ts';
import { CharSheetManager } from '../../../poc3/src/systems/char-sheet-manager.ts';
import { DamageManager } from '../../../poc3/src/systems/damage-manager.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DAMAGE = resolve(REPO_ROOT, 'poc3/src/systems/damage-manager.ts');

function withSummary(mgr: CharSheetManager, patch: Partial<SummarySheet>): CharSheetManager {
  const inner = mgr as unknown as { _summary: SummarySheet };
  Object.assign(inner._summary, patch);
  return mgr;
}

describe('CHAR-06 — Hit path MIT → SHD → INT', () => {
  let mgr: CharSheetManager;
  let damage: DamageManager;

  beforeEach(() => {
    mgr = CharSheetManager.create();
    damage = new DamageManager();
  });

  it('DamageManager module exists as sole applyDamage owner', () => {
    expect(existsSync(DAMAGE), 'poc3/src/systems/damage-manager.ts').toBe(true);
    expect(readFileSync(DAMAGE, 'utf8')).toMatch(/DamageManager|applyDamage/);
  });

  it('incoming damage: dealt = max(0, incoming − MIT) then shield then integrity', () => {
    withSummary(mgr, { MIT: 5, SHD: 20, integrity_cur: 100 });
    damage.applyDamage({ target: mgr, rawDamage: 30 });
    expect(mgr.summary.SHD).toBe(0);
    expect(mgr.summary.integrity_cur).toBe(95);
  });

  it('applyDamage never recomputes DEF / 10 on the hit path', () => {
    withSummary(mgr, { DEF: 50, MIT: 5, SHD: 100 });
    damage.applyDamage({ target: mgr, rawDamage: 10 });
    expect(mgr.summary.MIT).toBe(5);
    expect(mgr.summary.DEF).toBe(50);
  });

  it('shield absorbs before integrity on every hit', () => {
    withSummary(mgr, { MIT: 0, SHD: 15, integrity_cur: 100 });
    damage.applyDamage({ target: mgr, rawDamage: 10 });
    expect(mgr.summary.SHD).toBe(5);
    expect(mgr.summary.integrity_cur).toBe(100);
  });

  it('DRIFTING craft takes next hit as DEAD', () => {
    withSummary(mgr, { integrity_cur: 0, integrityState: 'DRIFTING', SHD: 0, MIT: 0 });
    damage.applyDamage({ target: mgr, rawDamage: 1 });
    expect(mgr.summary.integrityState).toBe('DEAD');
  });

  it.todo('ship–ship collision: each craft takes other.HP / 2 (D13)');

  it.todo('collision layers follow D14 matrix — no friendly fire unless allowed');

  it.todo('REG spend/regen reads Summary ENE/REG only');
});
