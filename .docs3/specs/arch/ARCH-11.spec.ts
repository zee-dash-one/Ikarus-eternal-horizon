/**
 * Source: plans/architecture.spec.MD → ARCH-11 · D38
 * Acceptance: "Invalid store → **400**; invalid/tampered ranking → **400/403**; DB never corrupted"
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const API = resolve(dirname(fileURLToPath(import.meta.url)), '../../../demo-host/src');

describe('ARCH-11 — DemoHost schema validation', () => {
  it('demo-host API validates store and ranking payloads', () => {
    expect(existsSync(API), 'demo-host/src').toBe(true);
    expect(true).toBe(false);
  });
});
