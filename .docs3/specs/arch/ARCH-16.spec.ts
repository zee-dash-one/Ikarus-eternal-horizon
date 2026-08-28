/**
 * Naming: .docs3/specs/arch/ARCH-16.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-16
 * Decision(s): D40
 * Tags       : tag_g_engine tag_s_engine_architecture_guardrails tag_s_engine_core_view_split
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "ESLint no-restricted-imports/globals on sim globs; verify fails"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ESLINT = resolve(REPO_ROOT, 'poc3/eslint.config.js');

describe('ARCH-16 — Core/Sim has zero Three.js or DOM imports', () => {
  it('poc3/eslint.config.js exists and targets sim globs', () => {
    expect(existsSync(ESLINT), 'poc3/eslint.config.js').toBe(true);
    const cfg = readFileSync(ESLINT, 'utf8');
    expect(cfg).toMatch(/src\/core\/\*\*\/\*\.ts/);
    expect(cfg).toMatch(/src\/systems\/\*\*\/\*\.ts/);
    expect(cfg).toMatch(/src\/gameobjects\/\*\*\/\*\.ts/);
  });

  it('sim globs restrict three imports and window/document globals', () => {
    expect(existsSync(ESLINT), 'poc3/eslint.config.js').toBe(true);
    const cfg = readFileSync(ESLINT, 'utf8');
    expect(cfg).toMatch(/no-restricted-imports/);
    expect(cfg).toMatch(/['"]three['"]/);
    expect(cfg).toMatch(/no-restricted-globals/);
    expect(cfg).toMatch(/window/);
    expect(cfg).toMatch(/document/);
  });
});
