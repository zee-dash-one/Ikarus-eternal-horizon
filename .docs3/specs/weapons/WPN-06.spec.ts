/**
 * Naming: .docs3/specs/weapons/WPN-06.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/weapons.spec.MD → WPN-06
 * Decision(s): D27
 * Tags       : tag_g_combat tag_s_combat_ordnance
 * Priority   : must
 * Theme      : Theme 11 — Weapon & ordnance variety
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Each type matches the effect table; 0 charges = no-op"
 */

import { describe, it, expect } from 'vitest';

describe('WPN-06 — Special ordnance charges', () => {
  it('each type matches the effect table; 0 charges = no-op', () => {
    expect(true).toBe(false);
  });

  it.todo('virtual B fires Bomb slot ordnance; Pulse Nova · Swarm · Star Killer');
});
