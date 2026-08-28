/**
 * Naming: .docs3/specs/scenes/SCENE-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/scenes.spec.MD → SCENE-02
 * Decision(s): D20 D23
 * Tags       : tag_g_scene_flow tag_s_scene_start_preload tag_s_assets_preload_buckets tag_s_assets_critical_ready_gate tag_s_audio_cue_dispatch tag_s_scene_canvas_render
 * Priority   : must
 * Theme      : Theme 0c — Start scene
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Cue fires once at ready; Start unlocks audio if needed; then Title"
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { AssetManager } from '../../../poc3/src/systems/asset-manager.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const START = resolve(REPO_ROOT, 'poc3/src/scenes/start-scene.ts');
const ASSETS = resolve(REPO_ROOT, 'poc3/src/systems/asset-manager.ts');

describe('SCENE-02 — Start cockpit preload and welcome cue', () => {
  it('StartScene and AssetManager modules exist', () => {
    expect(existsSync(START), 'poc3/src/scenes/start-scene.ts').toBe(true);
    expect(existsSync(ASSETS), 'poc3/src/systems/asset-manager.ts').toBe(true);
  });

  it('welcome_screen_ready fires once when critical preload is ready', () => {
    const assets = new AssetManager();
    const cues: string[] = [];
    assets.preload();
    expect(assets.criticalReady).toBe(true);
    assets.fireWelcomeIfReady((cue) => cues.push(cue));
    expect(cues).toEqual(['welcome_screen_ready']);
    assets.fireWelcomeIfReady((cue) => cues.push(cue));
    expect(cues).toHaveLength(1);
    expect(assets.welcomeFired).toBe(true);
  });

  it.todo('Start is canvas (D23): full-bleed cockpit + centered Start button');

  it.todo('early Start press shows Preparing… on the same button (no spinner scene)');

  it.todo('Start click unlocks audio (drain welcome queue) then mounts Title when ready');

  it.todo('asset cache-by-id survives StartScene.dispose()');
});
