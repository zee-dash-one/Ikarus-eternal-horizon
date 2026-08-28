/**
 * Naming: .docs3/specs/balance/RUL-12.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for RUL-12 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/balance.spec.MD → RUL-12
 * Decision(s): D46 D40 D07 D44
 * Tags       : tag_g_engine tag_s_engine_balance_source tag_s_engine_core_view_split
 * Priority   : must
 * Theme      : Theme 1 — Engine core
 * Render     : canvas (presentation keys on BALANCE; live pose on snapshot)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Core and canvas View read authored values only from `BALANCE`; `render/` has no presentation literals; live pose/HP stay on WorldSnapshot / Summary"
 *
 * Golden Rule reminder (D07/D40/D46): BALANCE lives in core/ as plain data.
 * View may import it. render/ must not invent colours, FOV, or chrome sizes.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { BALANCE } from '../../../poc3/src/core/balancer.ts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BALANCER = resolve(REPO_ROOT, 'poc3/src/core/balancer.ts');
const RENDER = resolve(REPO_ROOT, 'poc3/src/render');

const THEME1_NAMESPACES = ['layout', 'render', 'controls', 'loop'] as const;

describe('RUL-12 — Single BALANCE authored-value source', () => {
  it('core/balancer.ts exports BALANCE and BalanceConfig', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    const src = readFileSync(BALANCER, 'utf8');
    expect(src).toMatch(/export\s+(declare\s+)?const\s+BALANCE|export\s+const\s+BALANCE/);
    expect(src).toMatch(/BalanceConfig/);
    for (const ns of THEME1_NAMESPACES) {
      expect(src, ns).toMatch(new RegExp(ns));
    }
  });

  it('Theme 1 namespaces layout, render, controls, loop are present on BALANCE', () => {
    expect(BALANCE.layout.aspect).toBeCloseTo(16 / 9);
    expect(BALANCE.render.background).toBeDefined();
    expect(BALANCE.controls.keyboard).toBeDefined();
    expect(BALANCE.loop.dtClampSec).toBeGreaterThan(0);
  });

  it('systems/ and gameobjects/ do not import domain table files bypassing balancer.ts', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    const systemsDir = resolve(REPO_ROOT, 'poc3/src/systems');
    for (const file of readdirSync(systemsDir).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(resolve(systemsDir, file), 'utf8');
      if (src.includes('BALANCE')) {
        expect(src, file).toMatch(/balancer\.ts/);
      }
    }
  });

  it('render/ has no presentation literals (hex colour, fov, letterbox, bar size) — reads BALANCE', () => {
    expect(existsSync(RENDER), 'poc3/src/render').toBe(true);
    for (const file of readdirSync(RENDER).filter((f) => f.endsWith('.ts'))) {
      const src = readFileSync(resolve(RENDER, file), 'utf8');
      const hexLines = src
        .split('\n')
        .filter((line) => /0x[0-9a-fA-F]+/.test(line) && !line.includes('BALANCE'));
      expect(hexLines, file).toEqual([]);
      expect(src, file).toMatch(/BALANCE/);
    }
  });

  it.todo('WorldSnapshot / Summary hold live pose and HP; those fields are absent from BALANCE');

  it.todo('Pause Dev Balancer binds the same BALANCE object Core and View read (SCENE-05)');
});
