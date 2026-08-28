/**
 * Naming: .docs3/specs/input/CTRL-01.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CTRL-01 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/input.spec.MD → CTRL-01
 * Decision(s): D27 D40 D21
 * Tags       : tag_g_input tag_s_input_virtual_pad tag_s_input_device_adapters tag_s_input_schemes tag_s_input_pause_controls_tab
 * Priority   : must
 * Theme      : Theme 1 — Engine core
 * Render     : N/A (Core pad; Pause Controls tab later · SCENE-05)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Gameplay code reads only virtual tokens; scheme switch on Pause Controls; no hardware imports in `PlayerManager`/`FiringManager`"
 *
 * Golden Rule reminder (D07/D40): InputManager emits Commands into Core;
 * PlayerManager/FiringManager never import DOM/Three/nipplejs.
 *
 * Theme 1 overlap: GameLoop tick/pause → ARCH-17. BALANCE authored-value
 * source → RUL-12 (plans/balance.spec.MD · D46).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');
const INPUT = resolve(POC3, 'src/systems/input-manager.ts');
const PLAYER = resolve(POC3, 'src/systems/player-manager.ts');
const FIRING = resolve(POC3, 'src/systems/firing-manager.ts');

const VIRTUAL_TOKENS = [
  'Up',
  'Down',
  'Left',
  'Right',
  'Start',
  'A',
  'B',
  'X',
  'Y',
  'R1',
  'R2',
] as const;

const SCHEMES = ['keyboard', 'mix', 'gamepad', 'touch'] as const;

const HARDWARE_IMPORT = /KeyboardEvent|MouseEvent|Gamepad|nipplejs|from ['"]nipplejs['"]/;

describe('CTRL-01 — Virtual pad and exclusive scheme adapters', () => {
  it('InputManager module exists and exposes the locked port', () => {
    expect(existsSync(INPUT), 'poc3/src/systems/input-manager.ts').toBe(true);
    const src = readFileSync(INPUT, 'utf8');
    for (const name of ['update', 'isDown', 'wasPressed', 'axis', 'setScheme', 'dispose'] as const) {
      expect(src, name).toMatch(new RegExp(name));
    }
  });

  it('virtual vocabulary is exactly the locked tokens plus moveX/moveZ', () => {
    // given: pad token union
    // when: tokens are listed
    // then: VIRTUAL_TOKENS only; axes are moveX and moveZ in [-1, 1]
    expect(true).toBe(false);
  });

  it('exactly four exclusive adapters; default scheme is keyboard', () => {
    // given: KeyboardInputAdapter, MixInputAdapter, GamepadInputAdapter, TouchInputAdapter
    // when: boot
    // then: scheme === 'keyboard'; setScheme switches one active at a time
    expect(true).toBe(false);
  });

  it('InputManager does not import nipplejs', () => {
    expect(existsSync(INPUT), 'poc3/src/systems/input-manager.ts').toBe(true);
    expect(readFileSync(INPUT, 'utf8')).not.toMatch(/nipplejs/);
  });

  it('PlayerManager and FiringManager have no hardware imports', () => {
    for (const file of [PLAYER, FIRING]) {
      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, 'utf8')).not.toMatch(HARDWARE_IMPORT);
    }
  });

  it.todo('boot Keyboard: mouse click does not press virtual A');

  it.todo('Pause Controls setScheme(mix|gamepad|touch) keeps the same virtual tokens');

  it.todo('BALANCE.controls tables map physical → virtual only (no role rewrite)');

  it.todo('each tick InputManager enqueues Commands; Core never reads DOM');
});
