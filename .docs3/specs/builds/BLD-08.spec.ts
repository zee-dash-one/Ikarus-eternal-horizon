/**
 * Source: plans/builds.spec.MD → BLD-08 · D38
 * Acceptance: "`DemoStoreAdapter` + `DemoRankingAdapter` call `/api`"
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const DEMO_HOST = resolve(dirname(fileURLToPath(import.meta.url)), '../../../demo-host');

describe('BLD-08 — Demo kit uses DemoHost adapters', () => {
  it('demo-host/ package exists isolated from itch/poki/steam', () => {
    expect(existsSync(DEMO_HOST), 'demo-host/').toBe(true);
    expect(true).toBe(false);
  });
});
