/**
 * Naming: .docs3/specs/world/CAM-06.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → CAM-06
 * Decision(s): D21 D27 D40
 * Tags       : tag_g_world tag_s_world_free_cam tag_s_world_camera_rig
 * Priority   : must
 * Theme      : Theme 2 — World presentation
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "On: follow box ignored; fly works while paused and while live; Off: eases back to follow pose; pad still flies the ship"
 *
 * Golden Rule reminder (D21/D40): free-cam override pose lives in View so
 * it can tick on rAF while Core is paused. Fly keys IJKL/UO are outside
 * the virtual pad (D27).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { CameraManager } from '../../../poc3/src/systems/camera-manager.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMERA = resolve(REPO_ROOT, 'poc3/src/systems/camera-manager.ts');
const PLAYER = resolve(REPO_ROOT, 'poc3/src/systems/player-manager.ts');

describe('CAM-06 — Free Cam unlocks the rig in Run and Pause', () => {
  it('CameraManager exposes setFreeCam and freeCamEnabled', () => {
    expect(existsSync(CAMERA), 'poc3/src/systems/camera-manager.ts').toBe(true);
    const src = readFileSync(CAMERA, 'utf8');
    expect(src).toMatch(/setFreeCam/);
    expect(src).toMatch(/freeCamEnabled/);
    const cam = new CameraManager();
    expect(cam.freeCamEnabled).toBe(false);
    cam.setFreeCam(true);
    expect(cam.freeCamEnabled).toBe(true);
  });

  it('on: follow box ignored; fly works live and while Pause gates Core', () => {
    const cam = new CameraManager();
    const x0 = cam.state.x;
    cam.setFreeCam(true);
    expect(cam.freeCamEnabled).toBe(true);
    cam.updateFollow(
      { x: 100, y: 0, z: 100, rotY: 0, bank: 0, dashing: false },
      1,
    );
    expect(cam.state.x).toBeCloseTo(x0);
    cam.updateFreeCam(1, 0, 0, 0.1);
    expect(cam.state.x).not.toBeCloseTo(x0);
  });

  it('off: camera eases back onto follow-box pose (no teleport)', () => {
    const cam = new CameraManager();
    cam.setFreeCam(true);
    cam.updateFreeCam(3, 0, 0, 0.5);
    cam.setFreeCam(false);
    expect(cam.freeCamEnabled).toBe(false);
    cam.updateFollow(
      { x: 10, y: 0, z: 0, rotY: 0, bank: 0, dashing: false },
      1,
    );
    expect(cam.state.rotX).toBeDefined();
  });

  it('PlayerManager still reads the virtual pad; fly keys do not steal tokens', () => {
    expect(existsSync(PLAYER), 'poc3/src/systems/player-manager.ts').toBe(true);
    const src = readFileSync(PLAYER, 'utf8');
    expect(src).toMatch(/axis\('moveX'\)/);
    expect(src).toMatch(/axis\('moveZ'\)/);
    expect(src).not.toMatch(/KeyboardEvent/);
  });

  it.todo('RUL-02 despawn stays playfield/ship-relative — not the camera frustum');

  it.todo('HUD bars still project from the player craft, not the free camera');

  it.todo('next Run starts Free Cam off (Q49)');
});
