/**
 * Naming: .docs3/specs/auth/AUTH-08.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-08
 * Decision(s): D41
 * Tags       : tag_g_auth tag_s_auth_ui
 * Priority   : should
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "`.login--busy` / `.login--error`"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');

describe('AUTH-08 — Busy / error CSS states on form', () => {
  it('login stylesheet defines .login--busy and .login--error', () => {
    const cssCandidates = [
      resolve(POC3, 'src/ui/login.css'),
      resolve(POC3, 'src/styles/login.css'),
      resolve(POC3, 'index.html'),
    ];
    const found = cssCandidates.find((p) => existsSync(p));
    expect(found, 'login CSS or index.html').toBeTruthy();
    const src = readFileSync(found as string, 'utf8');
    expect(src).toMatch(/\.login--busy/);
    expect(src).toMatch(/\.login--error/);
  });

  it.todo('LoginUIBridge.applyResult toggles busy/error classes on #login-root');
});
