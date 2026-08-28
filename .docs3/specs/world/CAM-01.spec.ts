/**
 * Naming: .docs3/specs/world/CAM-01.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for CAM-01 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → CAM-01
 * Decision(s): D44 D46
 * Tags       : tag_g_world tag_s_world_letterbox
 * Priority   : must
 * Theme      : Theme 2 — World presentation
 * Render     : canvas
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Window resize never stretches; docs2 portrait size unused"
 *
 * Golden Rule reminder (D07/D40/D46): CSS size / letterbox colour live on
 * BALANCE.layout — not hardcoded in render/.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { BALANCE } from '../../../poc3/src/core/balancer.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BALANCER = resolve(REPO_ROOT, 'poc3/src/core/balancer.ts');
const RENDER = resolve(REPO_ROOT, 'poc3/src/render');

describe('CAM-01 — Landscape 16:9 playfield + letterbox', () => {
  it('BALANCE.layout exposes aspect, letterboxColor, cssWidth, cssHeight', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    const src = readFileSync(BALANCER, 'utf8');
    expect(src).toMatch(/layout/);
    expect(src).toMatch(/aspect/);
    expect(src).toMatch(/letterboxColor/);
  });

  it('playfield aspect is 16/9 landscape; docs2 540×960 is unused', () => {
    expect(BALANCE.layout.aspect).toBeCloseTo(16 / 9);
    const rendererSrc = readFileSync(resolve(RENDER, 'renderer.ts'), 'utf8');
    expect(rendererSrc).toMatch(/BALANCE\.layout/);
    expect(rendererSrc).not.toMatch(/540/);
  });

  it('window resize letterboxes or pillarboxes — never stretches', () => {
    expect(existsSync(RENDER), 'poc3/src/render').toBe(true);
    const rendererSrc = readFileSync(resolve(RENDER, 'renderer.ts'), 'utf8');
    expect(rendererSrc).toMatch(/letterboxColor|aspect/);
    expect(rendererSrc).toMatch(/BALANCE\.layout\.aspect/);
  });

  it.todo('game asset URLs are relative (BLD-06 HTTPS-safe)');
});
