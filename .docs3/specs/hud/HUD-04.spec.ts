/**
 * Naming: .docs3/specs/hud/HUD-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/hud.spec.MD → HUD-04
 * Decision(s): D45 D46
 * Tags       : tag_g_run_meta tag_s_run_hud_combat tag_g_player_ship
 * Priority   : must
 * Theme      : Theme 10 — Run meta
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Core has zero HUD imports; widgets stay inside letterboxed playfield"
 */

import { describe, it, expect } from 'vitest';

describe('HUD-04 — HUD View-only projector', () => {
  it('core has zero HUD imports; widgets stay inside letterboxed playfield', () => {
    expect(true).toBe(false);
  });

  it.todo('presentation sizes/colors from BALANCE.hud only (D46)');
});
