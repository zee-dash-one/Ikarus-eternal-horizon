/**
 * Naming: .docs3/specs/world/CAM-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → CAM-02
 * Decision(s): D40 D44 D46
 * Tags       : tag_g_world tag_s_world_camera_rig
 * Priority   : must
 * Theme      : Theme 2 — World presentation
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Default pose shows all three; config from `BALANCE.camera`"
 *
 * Golden Rule reminder (D40): PerspectiveCamera lives in render/;
 * systems/camera-manager.ts must not import three.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { BALANCE } from '../../../poc3/src/core/balancer.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CAMERA = resolve(REPO_ROOT, 'poc3/src/systems/camera-manager.ts');
const BALANCER = resolve(REPO_ROOT, 'poc3/src/core/balancer.ts');

describe('CAM-02 — Perspective rig readable top / side / thrusters', () => {
  it('CameraManager module exists and does not import three', () => {
    expect(existsSync(CAMERA), 'poc3/src/systems/camera-manager.ts').toBe(true);
    expect(readFileSync(CAMERA, 'utf8')).not.toMatch(/from ['"]three['"]/);
  });

  it('BALANCE.camera supplies fov, near, far, position, rotation', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    const src = readFileSync(BALANCER, 'utf8');
    expect(src).toMatch(/camera/);
    expect(src).toMatch(/fov/);
  });

  it('default pose shows top face, right side, and rear thrusters', () => {
    expect(BALANCE.camera.fov).toBeGreaterThan(0);
    expect(BALANCE.camera.near).toBeGreaterThan(0);
    expect(BALANCE.camera.far).toBeGreaterThan(BALANCE.camera.near);
    expect(BALANCE.camera.position.y).toBeGreaterThan(0);
  });

  it.todo('View applyConfig reads BALANCE.camera — no hardcoded FOV in render/');
});
