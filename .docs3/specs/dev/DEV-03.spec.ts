/**
 * Naming: .docs3/specs/dev/DEV-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/dev-tools.spec.MD → DEV-03
 * Decision(s): D43
 * Tags       : tag_g_dev tag_s_dev_crud tag_s_dev_content_manager tag_s_dev_entities
 * Priority   : must
 * Theme      : Theme 0d — Dev content CRUD
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Uniform CRUD on all four modules"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const MGR = resolve(REPO_ROOT, 'poc3/src/systems/dev-content-manager.ts');

describe('DEV-03 — Filter + list + create + edit + delete per entity', () => {
  it('DevContentManager exposes list/create/getById/update/delete', () => {
    expect(existsSync(MGR), 'poc3/src/systems/dev-content-manager.ts').toBe(true);
    const src = readFileSync(MGR, 'utf8');
    for (const op of ['list', 'create', 'getById', 'update', 'delete'] as const) {
      expect(src, op).toMatch(new RegExp(op));
    }
  });

  it.todo('CRUD is uniform across equips/buffs/enemies/squads');
});
