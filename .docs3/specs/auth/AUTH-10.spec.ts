/**
 * Naming: .docs3/specs/auth/AUTH-10.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-10
 * Decision(s): D41 Q30
 * Tags       : tag_g_auth tag_s_auth_adapter_steam
 * Priority   : should
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Google optional on Steam"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const STEAM = resolve(REPO_ROOT, 'poc3/src/platform/steam-auth-adapter.ts');
const KIT = resolve(REPO_ROOT, 'poc3/src/platform/kit-steam.ts');

describe('AUTH-10 — Steam build prefers Steam overlay auth', () => {
  it('SteamAuthAdapter exists and kit-steam wires it', () => {
    expect(existsSync(STEAM), 'poc3/src/platform/steam-auth-adapter.ts').toBe(true);
    expect(existsSync(KIT), 'poc3/src/platform/kit-steam.ts').toBe(true);
    expect(readFileSync(KIT, 'utf8')).toMatch(/SteamAuthAdapter/);
  });

  it.todo('Steam overlay auth is the preferred path; Google is optional fallback');
});
