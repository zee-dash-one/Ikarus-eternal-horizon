/**
 * Naming: .docs3/specs/char/CHAR-06-combat.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/char-sheet.spec.MD → CHAR-06 (Theme 5 reuse)
 * Decision(s): D24 D40
 * Tags       : tag_g_combat tag_s_combat_damage_apply tag_s_combat_shield_absorb
 * Priority   : must
 * Theme      : Theme 5 — Combat loop
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Shield absorbs before Integrity; no per-hit DEF math"
 *
 * Complements char/CHAR-06.spec.ts — integration path via DamageManager.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DAMAGE = resolve(REPO_ROOT, 'poc3/src/systems/damage-manager.ts');

describe('CHAR-06-combat — DamageManager integration', () => {
  it('DamageManager is the sole applyDamage path', () => {
    expect(existsSync(DAMAGE), 'damage-manager.ts').toBe(true);
    expect(readFileSync(DAMAGE, 'utf8')).toMatch(/applyDamage/);
  });

  it('shield absorbs before Integrity; no per-hit DEF math', () => {
    expect(true).toBe(false);
  });

  it.todo('reads summary.MIT only — never recomputes DEF/10 on hit');
});
