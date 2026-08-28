/**
 * Naming: .docs3/specs/world/CAM-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → CAM-03
 * Decision(s): D21 D40 D46
 * Tags       : tag_g_world tag_s_world_follow_box
 * Priority   : must
 * Theme      : Theme 2 — World presentation
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Ship inside box does not move camera; edge eases; still recenters; input interrupts"
 *
 * Golden Rule reminder (D40): follow-box math is Core (plain numbers on
 * WorldSnapshot). View copies camera world position from the snapshot.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { CameraManager } from '../../../poc3/src/systems/camera-manager.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMERA = resolve(REPO_ROOT, 'poc3/src/systems/camera-manager.ts');

describe('CAM-03 — Follow box: dead-zone, bounce, recenter', () => {
  it('CameraManager.updateFollow exists and is Core (no three)', () => {
    expect(existsSync(CAMERA), 'poc3/src/systems/camera-manager.ts').toBe(true);
    const src = readFileSync(CAMERA, 'utf8');
    expect(src).toMatch(/updateFollow/);
    expect(src).not.toMatch(/from ['"]three['"]/);
    expect(typeof new CameraManager().updateFollow).toBe('function');
  });

  it('ship inside halfX/halfZ does not move the camera', () => {
    const cam = new CameraManager();
    const x0 = cam.state.x;
    const z0 = cam.state.z;
    cam.updateFollow(
      { x: 1, y: 0, z: 1, rotY: 0, bank: 0, dashing: false },
      1 / 60,
    );
    expect(cam.state.x).toBeCloseTo(x0);
    expect(cam.state.z).toBeCloseTo(z0);
  });

  it.todo('crossing the box eases camera with bounce (BALANCE.followBox.bounceMs)');

  it.todo('still + delay recenters per-axis; input interrupts');

  it.todo('follow math does not advance while Core ticks are gated (D21)');

  it.todo('when CAM-06 is on, follow box is ignored');
});
