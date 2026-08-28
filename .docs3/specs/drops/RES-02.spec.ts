/**
 * Naming: .docs3/specs/drops/RES-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/drops.spec.MD → RES-02
 * Decision(s): D32
 * Tags       : tag_g_drops tag_s_drops_magnet_pull tag_g_audio tag_s_audio_cue_dispatch
 * Priority   : must
 * Theme      : Theme 7 — Resources & collection
 * Render     : N/A (SFX via SoundManager)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Approaching pulls; SFX + UI confirm"
 */

import { describe, it, expect } from 'vitest';

describe('RES-02 — Magnet collection + feedback', () => {
  it('approaching pulls; SFX + UI confirm', () => {
    expect(true).toBe(false);
  });

  it.todo('magnet radius/speed from BALANCE.drops only');
});
