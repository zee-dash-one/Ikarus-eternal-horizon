/**
 * Naming: .docs3/specs/squad/SQUAD-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/squad.spec.MD → SQUAD-03
 * Decision(s): D15 D17
 * Tags       : tag_g_squad tag_s_squad_formation_recipes
 * Priority   : must
 * Theme      : Theme 9 — Squads (data contract)
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Illegal mix cannot be selected"
 *
 * Data-structure slice: six formations + FORMATION_RECIPES. Spatial follow stays `it.todo`.
 */

import { describe, it, expect } from 'vitest';

const EXPECTED_FORMATIONS = [
  'V',
  'Circle',
  'CircleII',
  'CircleIII',
  'CircleIV',
  'LineDivers',
] as const;

describe('SQUAD-03 — Formations (data contract)', () => {
  it('SQUAD_FORMATIONS is exactly the six locked ids', () => {
    expect(true).toBe(false);
  });

  it('FORMATION_RECIPES covers every formation with locked slot counts', () => {
    // given: FORMATION_RECIPES
    // then: one row per EXPECTED_FORMATIONS
    //       CircleII = 3 Front Tanker + 4 InnerCircle Warrior (min=max=7)
    //       CircleIV = 1 Center Tanker + 3 Inner Warrior + 4 Outer Rogue (8)
    expect(true).toBe(false);
  });

  it('isLegalSquadMembership rejects Special and illegal mixes', () => {
    // given: CircleII with 3 Rogue Front
    //        CircleIV with a Special Center
    //        V with two classes
    // then: all false
    expect(true).toBe(false);
  });

  it.todo('illegal mix cannot be selected in SquadManager / /dev form');
});
