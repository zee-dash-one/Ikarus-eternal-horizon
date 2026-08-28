/**
 * Naming: .docs3/specs/dev/DEV-05.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/dev-tools.spec.MD → DEV-05
 * Decision(s): D43 BLD-05
 * Tags       : tag_g_dev tag_s_dev_routes tag_g_builds tag_s_builds_pipeline
 * Priority   : must
 * Theme      : Theme 0d — Dev content CRUD
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "`PROD` → no dev CRUD reachable"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROUTER = resolve(REPO_ROOT, 'poc3/src/ui/dev-routes.ts');

describe('DEV-05 — Production builds exclude /dev routes and bundle', () => {
  it('dev routes are gated by import.meta.env.DEV or PROD', () => {
    expect(existsSync(ROUTER), 'poc3/src/ui/dev-routes.ts').toBe(true);
    const src = readFileSync(ROUTER, 'utf8');
    expect(src).toMatch(/import\.meta\.env\.(DEV|PROD)/);
  });

  it.todo('PROD build: /dev/* unreachable and CRUD modules not in the bundle (BLD-05)');
});
