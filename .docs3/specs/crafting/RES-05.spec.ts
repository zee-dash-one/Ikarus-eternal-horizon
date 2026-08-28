/**
 * Naming: .docs3/specs/crafting/RES-05.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/crafting.spec.MD → RES-05
 * Decision(s): D31
 * Tags       : tag_g_resources tag_s_resources_inventory_caps tag_g_crafting
 * Priority   : should
 * Theme      : Theme 7 — Resources & collection
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "At cap, excess not collected (`tryAdd` → 0)"
 */

import { describe, it, expect } from 'vitest';

describe('RES-05 — Per-resource inventory caps', () => {
  it('at cap, excess not collected (tryAdd → 0)', () => {
    expect(true).toBe(false);
  });

  it.todo('Metal Scrap cap stub from BALANCE until Theme 12 expansion');
});
