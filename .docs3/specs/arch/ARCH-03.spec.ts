/**
 * Source: plans/architecture.spec.MD → ARCH-03
 * Acceptance: "Cold HTTPS boot reaches Login"
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const DEMO_HOST = resolve(dirname(fileURLToPath(import.meta.url)), '../../../demo-host');

describe('ARCH-03 — Caddy TLS to Node', () => {
  it('demo-host/ exists for Caddy + Node static/api', () => {
    expect(existsSync(DEMO_HOST), 'demo-host/').toBe(true);
    expect(true).toBe(false);
  });
});
