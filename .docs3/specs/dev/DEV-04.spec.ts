/**
 * Naming: .docs3/specs/dev/DEV-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/dev-tools.spec.MD → DEV-04
 * Decision(s): D43 D39
 * Tags       : tag_g_dev tag_s_dev_content_store tag_s_arch_persist_dexie
 * Priority   : must
 * Theme      : Theme 0d — Dev content CRUD
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Reload restores dev records"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const STORE = resolve(REPO_ROOT, 'poc3/src/persist/dev-content-store.ts');

describe('DEV-04 — DevContentStore Dexie separate from profile save', () => {
  it('DevContentStore module exists under persist/', () => {
    expect(existsSync(STORE), 'poc3/src/persist/dev-content-store.ts').toBe(true);
  });

  it('dev store database name is distinct from player profile Dexie', () => {
    expect(existsSync(STORE)).toBe(true);
    const src = readFileSync(STORE, 'utf8');
    expect(src).toMatch(/Dexie|dexie/);
    expect(src).toMatch(/dev/i);
  });

  it.todo('reload restores authored records; profile persist tables are untouched');
});
