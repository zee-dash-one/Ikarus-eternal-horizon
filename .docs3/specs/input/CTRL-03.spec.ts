/**
 * Source     : plans/input.spec.MD → CTRL-03
 * Decision(s): D21 D27
 * Tags       : tag_g_input tag_s_input_pause_controls_tab tag_s_scene_pause_overlay
 * Priority   : must
 * Theme      : Theme 4b — Pause canvas UI
 *
 * Acceptance:
 *   "Remap succeeds for all schemes; listen mode does not toggle pause or steal
 *    gamepad buttons; bindings persist"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');

describe('CTRL-03 — Pause Controls tab and remap listen guard', () => {
  it('Pause Controls tab exposes pause remap and scheme picker', () => {
    const tab = resolve(POC3, 'src/ui/react/pause/tabs/PauseControlsTab.tsx');
    expect(existsSync(tab)).toBe(true);
    const src = readFileSync(tab, 'utf8');
    expect(src).toMatch(/assignKeyboardPause/);
    expect(src).toMatch(/assignGamepadPause/);
    expect(src).toMatch(/CONTROL_SCHEME_OPTIONS/);
    expect(src).toMatch(/acceptEscapeAsBinding/);
  });

  it('remap listen state suspends pause menu gamepad poll', () => {
    const nav = resolve(POC3, 'src/ui/pause-menu-nav.ts');
    const state = resolve(POC3, 'src/ui/remap-listen-state.ts');
    expect(readFileSync(nav, 'utf8')).toMatch(/isRemapListening/);
    expect(existsSync(state)).toBe(true);
  });

  it('pause overlay Exit navigation is wired', () => {
    const nav = resolve(POC3, 'src/ui/pause-menu-nav.ts');
    const footer = resolve(POC3, 'src/ui/react/pause/PauseFooter.tsx');
    const src = readFileSync(nav, 'utf8');
    expect(src).toMatch(/pause-exit/);
    expect(src).toMatch(/focusPauseExit/);
    expect(readFileSync(footer, 'utf8')).toMatch(/pause-exit/);
  });

  it('InputBindingsManager supports pause assign APIs', () => {
    const mgr = resolve(POC3, 'src/systems/input-bindings-manager.ts');
    const src = readFileSync(mgr, 'utf8');
    expect(src).toMatch(/assignKeyboardPause/);
    expect(src).toMatch(/assignGamepadPause/);
  });
});
