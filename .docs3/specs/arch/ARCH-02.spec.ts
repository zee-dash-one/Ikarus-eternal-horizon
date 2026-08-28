/**
 * Naming: .docs3/specs/arch/ARCH-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-02
 * Decision(s): D38
 * Tags       : tag_g_builds tag_s_builds_demo_host
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Itch/Poki/Steam builds do not import it"
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEMO_HOST = resolve(REPO_ROOT, 'demo-host');
const POC3_SRC = resolve(REPO_ROOT, 'poc3/src');

function walkTs(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...walkTs(full));
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

describe('ARCH-02 — DemoHost is a sibling package', () => {
  it('demo-host/ exists next to poc3/ with its own package.json', () => {
    expect(existsSync(resolve(DEMO_HOST, 'package.json')), 'demo-host/package.json').toBe(
      true,
    );
  });

  it('itch/poki/steam kit modules do not import demo-host', () => {
    const kitFiles = [
      resolve(POC3_SRC, 'platform/kit-itch.ts'),
      resolve(POC3_SRC, 'platform/kit-poki.ts'),
      resolve(POC3_SRC, 'platform/kit-steam.ts'),
    ];
    for (const file of kitFiles) {
      expect(existsSync(file), relative(REPO_ROOT, file)).toBe(true);
      const src = readFileSync(file, 'utf8');
      expect(src, relative(REPO_ROOT, file)).not.toMatch(/demo-host/);
    }
  });

  it('no poc3/src file imports from demo-host/', () => {
    expect(existsSync(POC3_SRC), 'poc3/src').toBe(true);
    const hits: string[] = [];
    for (const file of walkTs(POC3_SRC)) {
      const src = readFileSync(file, 'utf8');
      if (/from ['"][^'"]*demo-host/.test(src) || /require\(['"][^'"]*demo-host/.test(src)) {
        hits.push(relative(REPO_ROOT, file));
      }
    }
    expect(hits).toEqual([]);
  });
});
