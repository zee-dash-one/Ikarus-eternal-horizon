/**
 * Naming: .docs3/specs/weapons/WPN-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/weapons.spec.MD → WPN-02
 * Decision(s): D14 D24 D40
 * Tags       : tag_g_combat tag_s_combat_collision_layers tag_s_combat_damage_apply
 * Priority   : must
 * Theme      : Theme 5 — Combat loop
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Enemy/meteor dies via `CHAR-06`; no second resolver"
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const COLLISION = resolve(REPO_ROOT, 'poc3/src/systems/collision-manager.ts');
const DAMAGE = resolve(REPO_ROOT, 'poc3/src/systems/damage-manager.ts');

describe('WPN-02 — PlayerShot hits via DamageManager only', () => {
  it('CollisionManager and DamageManager modules exist', () => {
    expect(existsSync(COLLISION), 'collision-manager.ts').toBe(true);
    expect(existsSync(DAMAGE), 'damage-manager.ts').toBe(true);
  });

  it('enemy/meteor dies via CHAR-06; no second resolver', () => {
    expect(true).toBe(false);
  });

  it.todo('layer matrix D14 gates PlayerShot × hostile pairs');
});
