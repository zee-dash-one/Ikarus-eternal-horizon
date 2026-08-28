/**
 * Naming: .docs3/specs/arch/ARCH-08.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-08
 * Decision(s): D39
 * Tags       : tag_g_builds tag_s_arch_persist_dexie
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "No localStorage SoT; iframe-safe"
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const PERSIST = resolve(REPO_ROOT, 'poc3/src/persist');
const PKG = resolve(REPO_ROOT, 'poc3/package.json');

function walkTs(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full));
    } else if (name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('ARCH-08 — Dexie without localStorage SoT', () => {
  it('poc3 depends on dexie', () => {
    expect(existsSync(PKG), 'poc3/package.json').toBe(true);
    const pkg = JSON.parse(readFileSync(PKG, 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(names.dexie).toBeDefined();
  });

  it('persist/ exists (Dexie schema stub home)', () => {
    expect(existsSync(PERSIST), 'poc3/src/persist').toBe(true);
  });

  it('persist/ does not use localStorage as source of truth', () => {
    expect(existsSync(PERSIST), 'poc3/src/persist').toBe(true);
    const hits: string[] = [];
    for (const file of walkTs(PERSIST)) {
      const src = readFileSync(file, 'utf8');
      if (/localStorage/.test(src)) {
        hits.push(relative(REPO_ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
