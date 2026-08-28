/**
 * Naming: .docs3/specs/scenes/SCENE-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/scenes.spec.MD → SCENE-04
 * Decision(s): D23 D42
 * Tags       : tag_g_scene_flow tag_s_scene_run_gameplay tag_s_scene_canvas_render
 * Priority   : should
 * Theme      : Theme 10 — Run meta
 * Render     : canvas (Result/Rankings are DOM — see run-meta/)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Run on canvas · Result/Rankings HTML/CSS + JS Bridge — [`rankings.spec.MD`](./rankings.spec.MD) (`RNK-04`)"
 */

import { describe, it, expect } from 'vitest';

describe('SCENE-04 — Title to Run (canvas)', () => {
  it('Title to Run transition stays on shared WebGL canvas', () => {
    expect(true).toBe(false);
  });

  it.todo('Run dispose on death hands off to Result DOM — not a canvas Result scene');
});
