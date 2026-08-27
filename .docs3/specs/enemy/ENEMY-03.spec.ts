/**
 * Naming: .docs3/specs/enemy/ENEMY-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/enemy.spec.MD → ENEMY-03
 * Decision(s): D15 D18
 * Tags       : tag_g_enemy tag_s_enemy_class_roles
 * Priority   : must
 * Theme      : Theme 8 — Enemies (data contract)
 * Render     : N/A (silhouette View later)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Formations resolve class roles; silhouette <0.3s"
 *
 * Data-structure slice: class / race / rank unions. Kits and mesh stay `it.todo`.
 */

import { describe, it, expect } from 'vitest';

const EXPECTED_ENEMY_CLASSES = ['Tanker', 'Warrior', 'Rogue', 'Special'] as const;
const EXPECTED_FORMATION_CLASSES = ['Tanker', 'Warrior', 'Rogue'] as const;

describe('ENEMY-03 — Classes (data contract)', () => {
  it('ENEMY_CLASSES is Tanker | Warrior | Rogue | Special', () => {
    // given: ENEMY_CLASSES
    // then: same set as EXPECTED_ENEMY_CLASSES
    expect(true).toBe(false);
  });

  it('FORMATION_CLASSES excludes Special', () => {
    // given: FORMATION_CLASSES and isFormationClass
    // when: 'Special' is tested
    // then: false; trio matches EXPECTED_FORMATION_CLASSES
    expect(true).toBe(false);
  });

  it('drone rank requires droneBand in 1..12; other kinds omit it', () => {
    // given: EnemyRank
    // when: { kind: 'drone', droneBand: 0 } / { kind: 'boss', droneBand: 1 }
    // then: both invalid
    expect(true).toBe(false);
  });

  it.todo('class kits bias CHAR families (D18) from BALANCE.enemies.classKits');

  it.todo('silhouette reads as class in <0.3s (View)');
});
