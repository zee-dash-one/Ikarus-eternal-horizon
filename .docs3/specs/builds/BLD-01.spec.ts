/**
 * Source: plans/builds.spec.MD → BLD-01
 * Acceptance: "`build:demo|itch|poki|steam` each emit a distinct artifact"
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '../../../poc3/package.json');

describe('BLD-01 — Four production outputs', () => {
  it('package.json defines build:demo|itch|poki|steam scripts', () => {
    expect(existsSync(PKG), 'poc3/package.json').toBe(true);
    const pkg = readFileSync(PKG, 'utf8');
    for (const script of ['build:demo', 'build:itch', 'build:poki', 'build:steam']) {
      expect(pkg, script).toMatch(new RegExp(script));
    }
  });
});
