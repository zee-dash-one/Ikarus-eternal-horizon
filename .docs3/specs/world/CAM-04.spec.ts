/**
 * Naming: .docs3/specs/world/CAM-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → CAM-04
 * Decision(s): D07 D40 D46
 * Tags       : tag_g_world tag_s_world_parallax
 * Priority   : must
 * Theme      : Theme 2 — World presentation
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Camera motion slides backgrounds at 3 readable rates"
 *
 * Golden Rule reminder (D07/D40): parallax offsets are Core numbers on the
 * snapshot; layers do not read Full Sheet. Gains live on BALANCE.parallax.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { BALANCE } from '../../../poc3/src/core/balancer.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BALANCER = resolve(REPO_ROOT, 'poc3/src/core/balancer.ts');
const RENDER = resolve(REPO_ROOT, 'poc3/src/render');

describe('CAM-04 — Three parallax layers, distinct speeds', () => {
  it('BALANCE.parallax.layers has exactly three entries', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    expect(BALANCE.parallax.layers).toHaveLength(3);
  });

  it('ParallaxField View module exists under render/', () => {
    expect(existsSync(RENDER), 'poc3/src/render').toBe(true);
    expect(existsSync(resolve(RENDER, 'parallax-field.ts'))).toBe(true);
    const src = readFileSync(resolve(RENDER, 'parallax-field.ts'), 'utf8');
    expect(src).toMatch(/BALANCE\.parallax/);
  });

  it('camera Δ between frames shifts layers at three distinct rates', () => {
    const speeds = BALANCE.parallax.layers.map((layer) => layer.speed);
    expect(new Set(speeds).size).toBe(3);
    expect(speeds.every((speed) => speed > 0 && speed < 1)).toBe(true);
  });

  it.todo('layers do not read Full Sheet on the hot path');

  it.todo('free-cam fly still slides parallax (camera Δ, not follow box)');
});
