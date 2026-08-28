/**
 * Naming: .docs3/specs/arch/ARCH-19.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-19
 * Decision(s): D40
 * Tags       : tag_g_engine tag_s_engine_core_view_split tag_s_engine_architecture_guardrails
 * Priority   : should
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Core tests green with pure TS only"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const VITEST = resolve(REPO_ROOT, 'poc3/vitest.config.ts');
const PKG = resolve(REPO_ROOT, 'poc3/package.json');

describe('ARCH-19 — Sim unit tests without WebGL/jsdom Three', () => {
  it('poc3 has a vitest config that can run node environment tests', () => {
    const cfgPath = existsSync(VITEST)
      ? VITEST
      : resolve(REPO_ROOT, 'poc3/vite.config.ts');
    expect(existsSync(cfgPath), 'poc3 vitest or vite config').toBe(true);
    const cfg = readFileSync(cfgPath, 'utf8');
    expect(cfg).toMatch(/vitest|test:/);
  });

  it('package.json test script uses vitest (not a browser runner)', () => {
    expect(existsSync(PKG), 'poc3/package.json').toBe(true);
    const pkg = JSON.parse(readFileSync(PKG, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.test).toMatch(/vitest/);
  });

  it.todo('a Core GameLoop/command test file runs with environment node (no jsdom, no three)');
});
