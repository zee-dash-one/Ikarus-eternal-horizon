/**
 * Source: plans/architecture.spec.MD → ARCH-06
 * Acceptance: "Operator can ship without CI"
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const DEPLOY = resolve(dirname(fileURLToPath(import.meta.url)), '../../../demo-host/README.md');

describe('ARCH-06 — Manual deploy docs', () => {
  it('operator can ship without CI', () => {
    expect(existsSync(DEPLOY), 'demo-host deploy docs').toBe(true);
    expect(true).toBe(false);
  });
});
