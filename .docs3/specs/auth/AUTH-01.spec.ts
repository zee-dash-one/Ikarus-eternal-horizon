/**
 * Naming: .docs3/specs/auth/AUTH-01.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for AUTH-01 is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-01
 * Decision(s): D41 D34 D23
 * Tags       : tag_g_auth tag_s_auth_ui tag_s_auth_ui_bridge
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "No canvas Login scene; `#login-root` DOM"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const POC3 = resolve(REPO_ROOT, 'poc3');

describe('AUTH-01 — Login UI is HTML/CSS shell', () => {
  it('index.html exposes #login-root as DOM chrome', () => {
    const htmlPath = resolve(POC3, 'index.html');
    expect(existsSync(htmlPath), 'poc3/index.html').toBe(true);
    expect(readFileSync(htmlPath, 'utf8')).toContain('id="login-root"');
  });

  it('there is no canvas Login scene module', () => {
    const canvasLogin = resolve(POC3, 'src/scenes/login-scene.ts');
    expect(existsSync(canvasLogin), 'must not exist: src/scenes/login-scene.ts').toBe(
      false,
    );
  });

  it.todo('LoginUIBridge mirrors StoreUIBridge (same-document JS, no WebSocket)');
});
