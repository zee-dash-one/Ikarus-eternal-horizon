/**
 * Naming: .docs3/specs/dev/DEV-01.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/dev-tools.spec.MD → DEV-01
 * Decision(s): D43 BLD-05
 * Tags       : tag_g_dev tag_s_dev_routes tag_s_dev_crud
 * Priority   : must
 * Theme      : Theme 0d — Dev content CRUD
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "`/dev/equips` · `buffs` · `enemies` · `squads`"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const ROUTER = resolve(REPO_ROOT, 'poc3/src/ui/dev-routes.ts');

const DEV_PATHS = [
  '/dev/equips',
  '/dev/buffs',
  '/dev/enemies',
  '/dev/squads',
] as const;

describe('DEV-01 — Four /dev/* CRUD routes in DEV only', () => {
  it('dev router registers the four locked paths', () => {
    expect(existsSync(ROUTER), 'poc3/src/ui/dev-routes.ts').toBe(true);
    const src = readFileSync(ROUTER, 'utf8');
    for (const path of DEV_PATHS) {
      expect(src, path).toContain(path);
    }
  });

  it('does not register split special-equips / generic-equips routes', () => {
    expect(existsSync(ROUTER), 'poc3/src/ui/dev-routes.ts').toBe(true);
    const src = readFileSync(ROUTER, 'utf8');
    expect(src).not.toContain('/dev/special-equips');
    expect(src).not.toContain('/dev/generic-equips');
  });

  it.todo('routes are unreachable when import.meta.env.PROD (DEV-05 / BLD-05)');
});
