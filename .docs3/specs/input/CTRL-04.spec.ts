/**
 * Source     : plans/input.spec.MD → CTRL-04
 * Decision(s): D27
 * Tags       : tag_g_input tag_s_input_nipplejs_touch
 * Priority   : must
 * Theme      : Theme 1 — Engine core (View touch chrome)
 *
 * Acceptance:
 *   "Buttons tappable over HUD; pause top-right; combat bottom-right; nipplejs isolated"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');
const TOUCH = resolve(POC3, 'src/ui/touch-controls/touch-controls.ts');
const STYLE = resolve(POC3, 'src/style.css');
const INPUT_MGR = resolve(POC3, 'src/systems/input-manager.ts');

describe('CTRL-04 — Touch overlay layout and stacking', () => {
  it('touch-controls uses dedicated classes and pause corner', () => {
    const src = readFileSync(TOUCH, 'utf8');
    expect(src).toMatch(/touch-controls__pause/);
    expect(src).toMatch(/touch-controls__cluster/);
    expect(src).toMatch(/touch-controls__stick/);
    expect(src).toMatch(/touchPauseVirtualToken/);
    expect(src).toMatch(/nipplejs/);
  });

  it('InputManager does not import nipplejs', () => {
    expect(readFileSync(INPUT_MGR, 'utf8')).not.toMatch(/nipplejs/);
  });

  it('style.css stacks touch overlay above HUD with transparency', () => {
    const css = readFileSync(STYLE, 'utf8');
    expect(css).toMatch(/\.touch-controls\s*\{[^}]*z-index:\s*40/s);
    expect(css).toMatch(/\.touch-controls__btn/);
    expect(css).toMatch(/rgba\(/);
    const hudIdx = css.indexOf('.hud {');
    const touchIdx = css.indexOf('.touch-controls {');
    expect(touchIdx).toBeGreaterThan(-1);
    expect(hudIdx).toBeGreaterThan(-1);
    expect(css.slice(touchIdx, touchIdx + 200)).toMatch(/z-index:\s*40/);
    expect(css.slice(hudIdx, hudIdx + 200)).toMatch(/z-index:\s*5/);
  });
});
