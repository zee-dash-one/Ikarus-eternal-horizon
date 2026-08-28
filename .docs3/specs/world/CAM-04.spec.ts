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

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BALANCER = resolve(REPO_ROOT, 'poc3/src/core/balancer.ts');
const RENDER = resolve(REPO_ROOT, 'poc3/src/render');

describe('CAM-04 — Three parallax layers, distinct speeds', () => {
  it('BALANCE.parallax.layers has exactly three entries', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    expect(true).toBe(false);
  });

  it('ParallaxField View module exists under render/', () => {
    expect(existsSync(RENDER), 'poc3/src/render').toBe(true);
    expect(true).toBe(false);
  });

  it('camera Δ between frames shifts layers at three distinct rates', () => {
    // given: three gains on BALANCE.parallax.layers[]
    // when: camera moves
    // then: three readable speeds; wrap at zNearWrap / zFar
    expect(true).toBe(false);
  });

  it.todo('layers do not read Full Sheet on the hot path');

  it.todo('free-cam fly still slides parallax (camera Δ, not follow box)');
});
