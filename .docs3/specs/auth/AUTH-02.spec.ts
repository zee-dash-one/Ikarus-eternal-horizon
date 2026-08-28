/**
 * Naming: .docs3/specs/auth/AUTH-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-02
 * Decision(s): D41
 * Tags       : tag_g_auth tag_s_auth_manager tag_s_auth_ui
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "UI never sets cookies or tokens"
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const AUTH_MGR = resolve(REPO_ROOT, 'poc3/src/systems/auth-manager.ts');

describe('AUTH-02 — AuthManager sole sign-in authority', () => {
  it('AuthManager module exists under systems/', () => {
    expect(existsSync(AUTH_MGR), 'poc3/src/systems/auth-manager.ts').toBe(true);
  });

  it.todo('LoginUIBridge / #login-root handlers never write cookies or tokens');

  it.todo('only AuthManager + AuthPlatformAdapter mutate session');
});
