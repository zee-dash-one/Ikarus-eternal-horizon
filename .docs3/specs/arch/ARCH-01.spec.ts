/**
 * Naming: .docs3/specs/arch/ARCH-01.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for ARCH-01 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-01
 * Decision(s): D38 D40
 * Tags       : tag_g_builds tag_s_arch_stack tag_g_engine
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A (repo scaffold)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Theme 0 scaffold matches this file"
 *
 * Golden Rule reminder (D07/D40): core/ systems/ gameobjects/ must not
 * import three/DOM — asserted by ARCH-16 / ARCH-20.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');

const SRC_DIRS = [
  'core',
  'systems',
  'gameobjects',
  'scenes',
  'render',
  'ui',
  'pools',
  'platform',
  'persist',
] as const;

const STACK_DEPS = ['vite', 'typescript', 'three', 'vitest', 'dexie'] as const;

describe('ARCH-01 — Client stack in poc3/', () => {
  it('poc3/package.json exists with Vite, TypeScript, Three, Vitest, Dexie', () => {
    const pkgPath = resolve(POC3, 'package.json');
    expect(existsSync(pkgPath), 'poc3/package.json').toBe(true);
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    const names = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    for (const dep of STACK_DEPS) {
      expect(names[dep], dep).toBeDefined();
    }
    expect(pkg.scripts?.verify).toMatch(/typecheck/);
    expect(pkg.scripts?.verify).toMatch(/lint/);
    expect(pkg.scripts?.verify).toMatch(/test/);
  });

  it('src/ has the D40 folder tree', () => {
    for (const dir of SRC_DIRS) {
      expect(existsSync(resolve(POC3, 'src', dir)), `poc3/src/${dir}`).toBe(true);
    }
  });

  it('index.html exposes #login-root, a canvas, and #store-root', () => {
    const htmlPath = resolve(POC3, 'index.html');
    expect(existsSync(htmlPath), 'poc3/index.html').toBe(true);
    const html = readFileSync(htmlPath, 'utf8');
    expect(html).toContain('id="login-root"');
    expect(html).toMatch(/<canvas\b/i);
    expect(html).toContain('id="store-root"');
  });
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
