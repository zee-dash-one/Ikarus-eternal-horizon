/**
 * Naming: .docs3/specs/drops/RES-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/drops.spec.MD → RES-03
 * Decision(s): D32 D40
 * Tags       : tag_g_drops tag_s_drops_fragment_pool
 * Priority   : must
 * Theme      : Theme 7 — Resources & collection
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Long session does not grow unbounded heap"
 */

import { describe, it, expect } from 'vitest';

describe('RES-03 — Fragment pool recycle', () => {
  it('long session does not grow unbounded heap', () => {
    expect(true).toBe(false);
  });

  it.todo('liveCount <= BALANCE.drops.poolSize');
});
