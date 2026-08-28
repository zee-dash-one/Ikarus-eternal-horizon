/**
 * Naming: .docs3/specs/hud/HUD-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/hud.spec.MD → HUD-02
 * Decision(s): D45
 * Tags       : tag_g_run_meta tag_s_run_hud_border
 * Priority   : must
 * Theme      : Theme 10 — Run meta
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Counters match RunState; high is current-mode local best"
 */

import { describe, it, expect } from 'vitest';

describe('HUD-02 — Border score kills high-score', () => {
  it('counters match RunState; high is current-mode local best', () => {
    expect(true).toBe(false);
  });
});
