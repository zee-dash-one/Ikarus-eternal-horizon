/**
 * Naming: .docs3/specs/scenes/SCENE-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/scenes.spec.MD → SCENE-03
 * Decision(s): D23 D34
 * Tags       : tag_g_scene_flow tag_s_scene_title_menu tag_s_scene_canvas_render
 * Priority   : should
 * Theme      : Theme 10 — Run meta
 * Render     : canvas (Store tab is DOM)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Canvas hub — entered from Start; Store tab is DOM (`D34`)"
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCENES = resolve(REPO_ROOT, 'poc3/src/scenes');

describe('SCENE-03 — Title scene (canvas hub)', () => {
  it('Title scene module exists under poc3/src/scenes', () => {
    expect(existsSync(SCENES), 'poc3/src/scenes').toBe(true);
    expect(true).toBe(false);
  });

  it.todo('entered from Start; gameplay CTA mounts Run');

  it.todo('Store tab is DOM #store-root — not a canvas scene swap (D34)');
});
