/**
 * Naming: .docs3/specs/arch/ARCH-20.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-20
 * Decision(s): D40
 * Tags       : tag_g_engine tag_s_engine_architecture_guardrails
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "eslint.config.js sim snippet merged; lint red on three in core/"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ESLINT = resolve(REPO_ROOT, 'poc3/eslint.config.js');
const SNIPPET = resolve(REPO_ROOT, '.docs3/templates/eslint-sim-boundary.snippet.js');
const PKG = resolve(REPO_ROOT, 'poc3/package.json');

describe('ARCH-20 — Golden Rule guardrails in npm run verify', () => {
  it('poc3/eslint.config.js merges the sim-boundary snippet', () => {
    expect(existsSync(SNIPPET), '.docs3/templates/eslint-sim-boundary.snippet.js').toBe(
      true,
    );
    expect(existsSync(ESLINT), 'poc3/eslint.config.js').toBe(true);
    const cfg = readFileSync(ESLINT, 'utf8');
    expect(cfg).toMatch(/simBoundaryGuardrails|no-restricted-imports/);
    expect(cfg).toMatch(/src\/core\/\*\*\/\*\.ts/);
    expect(cfg).toMatch(/Core\/Sim must not import Three\.js/);
  });

  it('npm run verify includes lint', () => {
    expect(existsSync(PKG), 'poc3/package.json').toBe(true);
    const pkg = JSON.parse(readFileSync(PKG, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.verify).toMatch(/lint/);
  });

  it.todo('eslint fails when a file under src/core/ imports three');
});
