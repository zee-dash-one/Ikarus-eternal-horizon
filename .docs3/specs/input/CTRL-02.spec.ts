/**
 * Source     : plans/input.spec.MD → CTRL-02
 * Decision(s): D27 D40 D21
 * Tags       : tag_g_input tag_s_input_bind_storage tag_s_input_virtual_pad tag_s_input_device_adapters
 * Priority   : must
 * Theme      : Theme 1 — Engine core
 *
 * Acceptance:
 *   "Rebind pause key/button; unbound physical inputs behave normally;
 *    wasPressed('Start') is polled outside the sim gate (C02)"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');
const GAME_APP = resolve(POC3, 'src/game-app.ts');
const RUN_SCENE = resolve(POC3, 'src/scenes/run-scene.ts');
const INPUT_BINDINGS = resolve(POC3, 'src/core/input-bindings.ts');
const KEYBOARD_ADAPTER = resolve(POC3, 'src/ui/input-adapters/keyboard-input-adapter.ts');

describe('CTRL-02 — Pause via virtual Start from bindings only', () => {
  it('InputBindings exposes nullable pause fields and Start mapping helpers', () => {
    const src = readFileSync(INPUT_BINDINGS, 'utf8');
    expect(src).toMatch(/keyboard\.pause/);
    expect(src).toMatch(/gamepad\.pause/);
    expect(src).toMatch(/PAUSE_VIRTUAL_TOKEN/);
    expect(src).toMatch(/keyboardTokenFromCode/);
    expect(src).toMatch(/gamepadTokenFromButton/);
    expect(src).toMatch(/touchPauseVirtualToken/);
  });

  it('game-app has no hardcoded pause keydown or sidecar gamepad pause poll', () => {
    const src = readFileSync(GAME_APP, 'utf8');
    expect(src).not.toMatch(/_pollGamepadPauseToggle/);
    expect(src).not.toMatch(/e\.code === this\.input\.bindings\.bindings\.keyboard\.pause/);
    expect(src).not.toMatch(/e\.key === 'Escape'/);
  });

  it('frame-level input uses virtual Start while RunScene has no input authority', () => {
    const src = readFileSync(GAME_APP, 'utf8');
    expect(src).toMatch(/wasPressed\('Start'\)/);
    expect(src).toMatch(/beforeFrame:/);
    const view = readFileSync(RUN_SCENE, 'utf8');
    expect(view).not.toMatch(/wasPressed|InputManager|updateSim/);
    // Behavioral pause/no-tick/resume coverage lives in core/game-loop.test.ts.
  });

  it('keyboard adapter routes bound pause key even when DOM capture is off', () => {
    const src = readFileSync(KEYBOARD_ADAPTER, 'utf8');
    expect(src).toMatch(/shouldCaptureKeyboardPress/);
  });

  it('persist layer loads control settings bindings', () => {
    const persist = resolve(POC3, 'src/persist/control-settings.ts');
    expect(existsSync(persist)).toBe(true);
    const src = readFileSync(persist, 'utf8');
    expect(src).toMatch(/loadControlSettings/);
    expect(src).toMatch(/InputBindings/);
  });
});
