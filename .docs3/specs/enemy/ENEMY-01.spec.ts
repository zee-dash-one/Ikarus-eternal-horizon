/**
 * Naming: .docs3/specs/enemy/ENEMY-01.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/enemy.spec.MD → ENEMY-01
 * Decision(s): D01
 * Tags       : tag_g_enemy tag_s_enemy_base_fields
 * Priority   : must
 * Theme      : Theme 8 — Enemies (data contract)
 * Render     : N/A (Core types; Pause Balancer / /dev bind later)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Every enemy exposes the trio"
 *
 * Data-structure slice: EnemyBase fields + EnemyCraft = base + CharSheet.
 * Spawn/pool stays `it.todo`.
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('ENEMY-01 — Enemy Base (data contract)', () => {
  beforeEach(() => {
    // arrange: EnemyCraft from template
  });

  it('every EnemyCraft exposes base.id, base.strategy, base.ticks', () => {
    // given: a spawned craft
    // when: base is read
    // then: id is a non-empty string; strategy is an EnemyStrategy; ticks is an integer ≥ 0
    expect(true).toBe(false);
  });

  it('EnemyCraft always carries a CharSheet sibling to base', () => {
    // given: create from template
    // when: craft is inspected
    // then: craft.sheet.summary and craft.sheet.full exist (CHAR-01 empty defaults)
    //       craft.squadId === null until assigned
    expect(true).toBe(false);
  });

  it.todo('EnemyManager pool acquire/release does not drop the trio');
});
