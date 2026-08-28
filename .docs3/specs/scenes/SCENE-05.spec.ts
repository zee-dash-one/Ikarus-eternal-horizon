/**
 * Naming: .docs3/specs/scenes/SCENE-05.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for SCENE-05 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/scenes.spec.MD → SCENE-05
 * Decision(s): D21 D23 D27
 * Tags       : tag_g_scene_flow tag_s_scene_pause_overlay tag_g_input tag_s_scene_canvas_render
 * Priority   : must
 * Theme      : Theme 4b — Pause canvas UI
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Opens once Run shows player ship + parallax; sim frozen while open"
 *
 * Golden Rule reminder (D21/D40): Pause gates Core ticks only; View may
 * still paint frozen frame + overlay. Dev tab compiled out in PROD (BLD-05).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { GameLoop } from '../../../poc3/src/core/game-loop.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CORE = resolve(REPO_ROOT, 'poc3/src/core/game-loop.ts');

describe('SCENE-05 — Pause overlay freezes sim', () => {
  it('GameLoop pause gate exists in core/', () => {
    expect(existsSync(CORE), 'poc3/src/core/game-loop.ts').toBe(true);
    expect(readFileSync(CORE, 'utf8')).toMatch(/pause/i);
  });

  it('opens once Run shows player ship + parallax; sim frozen while open', () => {
    let steps = 0;
    const loop = new GameLoop({
      step: () => {
        steps += 1;
      },
    });
    loop.pause();
    loop.stepSim();
    expect(loop.paused).toBe(true);
    expect(steps).toBe(0);
    loop.resume();
    loop.stepSim();
    expect(steps).toBe(1);
  });

  it.todo('right rail: Controls · Audio · Graphics · Dev (DEV-only)');

  it.todo('resume unpause: same pose, no dt catch-up; overlay dispose does not tear down Run');

  it.todo('PROD build has no Dev tab (BLD-05); Free Cam stays under Graphics (CAM-06)');
});
