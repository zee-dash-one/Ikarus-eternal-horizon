/**
 * Naming: .docs3/specs/run-meta/SCENE-04-result.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/scenes.spec.MD → SCENE-04 (Result DOM · D42)
 * Decision(s): D42 D23
 * Tags       : tag_g_run_meta tag_s_run_result_screen tag_s_scene_result_ui
 * Priority   : should
 * Theme      : Theme 10 — Run meta
 * Render     : DOM (#result-root)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from scenes §Title/Run/Result):
 *
 *   "Run dispose on death tears down gameplay graph; Result DOM takes focus without leaking Run listeners"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const INDEX = resolve(REPO_ROOT, 'poc3/index.html');

describe('SCENE-04-result — Result DOM after DEAD', () => {
  it('shell exposes #result-root', () => {
    expect(existsSync(INDEX), 'poc3/index.html').toBe(true);
    expect(readFileSync(INDEX, 'utf8')).toMatch(/result-root/);
  });

  it('run dispose on death tears down gameplay graph; Result DOM takes focus without leaking Run listeners', () => {
    expect(true).toBe(false);
  });

  it.todo('ResultUIBridge ↔ RunResultManager — no WebSocket (D42)');
});
