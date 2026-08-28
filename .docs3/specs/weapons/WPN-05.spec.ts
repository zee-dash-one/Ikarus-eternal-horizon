/**
 * Naming: .docs3/specs/weapons/WPN-05.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/weapons.spec.MD → WPN-05
 * Decision(s): D07
 * Tags       : tag_g_combat tag_s_combat_energy_gate tag_s_combat_weapon_fire
 * Priority   : must
 * Theme      : Theme 5 — Combat loop (Theme 11 reuses for per-profile costs)
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Laser drains; at 0 fire is a no-op (Theme 11: costs differ per id)"
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FIRING = resolve(REPO_ROOT, 'poc3/src/systems/firing-manager.ts');
const ENERGY = resolve(REPO_ROOT, 'poc3/src/systems/energy-manager.ts');

describe('WPN-05 — Energy gate on fire', () => {
  it('FiringManager and EnergyManager modules exist', () => {
    expect(existsSync(FIRING), 'firing-manager.ts').toBe(true);
    expect(existsSync(ENERGY), 'energy-manager.ts').toBe(true);
  });

  it('laser drains; at 0 fire is a no-op', () => {
    expect(true).toBe(false);
  });

  it.todo('Theme 11: distinct ENE costs per weapon profile id on BALANCE.weapons');
});
