/**
 * Naming: .docs3/specs/rankings/RNK-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/rankings.spec.MD → RNK-02
 * Decision(s): D30
 * Tags       : tag_g_rankings tag_s_rankings_board_matrix
 * Priority   : should
 * Theme      : Theme 10 — Run meta
 * Render     : N/A (client window calc)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Weekly board resets on Monday UTC"
 */

import { describe, it, expect } from 'vitest';

describe('RNK-02 — UTC window calc W/M/Y', () => {
  it('weekly board resets on Monday UTC', () => {
    expect(true).toBe(false);
  });

  it.todo('2 modes × 4 periods board matrix');
});
