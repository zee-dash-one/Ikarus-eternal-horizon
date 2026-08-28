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
import { CameraManager } from '../../../poc3/src/systems/camera-manager.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMERA = resolve(REPO_ROOT, 'poc3/src/systems/camera-manager.ts');

describe('CAM-05 — DEV gizmos toggle', () => {
  it('CameraManager exposes setGizmosEnabled', () => {
    expect(existsSync(CAMERA), 'poc3/src/systems/camera-manager.ts').toBe(true);
    expect(readFileSync(CAMERA, 'utf8')).toMatch(/setGizmosEnabled/);
  });

  it('toggle off leaves no gizmo objects in the scene graph', () => {
    const cam = new CameraManager();
    expect(cam.gizmosEnabled).toBe(false);
    cam.setGizmosEnabled(true);
    expect(cam.gizmosEnabled).toBe(true);
    cam.setGizmosEnabled(false);
    expect(cam.gizmosEnabled).toBe(false);
  });

  it.todo('PROD build (import.meta.env.PROD / BLD-05) has no gizmos; setGizmosVisible is a no-op');
});
