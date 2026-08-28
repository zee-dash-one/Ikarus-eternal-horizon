/**
 * Naming: .docs3/specs/world/CAM-05.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → CAM-05
 * Decision(s): BLD-05
 * Tags       : tag_g_world tag_s_world_gizmos
 * Priority   : should
 * Theme      : Theme 2 — World presentation
 * Render     : canvas (DEV-only)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Off leaves no objects; PROD build has no gizmos"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMERA = resolve(REPO_ROOT, 'poc3/src/systems/camera-manager.ts');

describe('CAM-05 — DEV gizmos toggle', () => {
  it('CameraManager exposes setGizmosVisible', () => {
    expect(existsSync(CAMERA), 'poc3/src/systems/camera-manager.ts').toBe(true);
    expect(readFileSync(CAMERA, 'utf8')).toMatch(/setGizmosVisible/);
  });

  it('toggle off leaves no gizmo objects in the scene graph', () => {
    // given: world axes · playfield grid · camera axes
    // when: setGizmosVisible(false)
    // then: no leftover scene-graph objects
    expect(true).toBe(false);
  });

  it.todo('PROD build (import.meta.env.PROD / BLD-05) has no gizmos; setGizmosVisible is a no-op');
});
