/**
 * Naming: .docs3/specs/auth/AUTH-09.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-09
 * Decision(s): D38 D41
 * Tags       : tag_g_auth tag_s_auth_adapter_demo tag_s_arch_demohost_api
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Matches `ARCH-05`"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEMO = resolve(REPO_ROOT, 'poc3/src/platform/demo-auth-adapter.ts');

describe('AUTH-09 — Demo auth via httpOnly cookie + GET /api/me', () => {
  it('DemoAuthAdapter probes GET /api/me', () => {
    expect(existsSync(DEMO), 'poc3/src/platform/demo-auth-adapter.ts').toBe(true);
    const src = readFileSync(DEMO, 'utf8');
    expect(src).toMatch(/\/api\/me/);
  });

  it.todo('client never reads session token from document.cookie (httpOnly)');

  it.todo('probeSession uses credentials: include so the cookie is sent');
});
