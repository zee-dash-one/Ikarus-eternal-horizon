/**
 * Naming: .docs3/specs/auth/AUTH-07.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-07
 * Decision(s): D41 D34
 * Tags       : tag_g_auth tag_s_auth_ui_bridge
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Same as `STR-06` / `D34`"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BRIDGE = resolve(REPO_ROOT, 'poc3/src/ui/login-ui-bridge.ts');

describe('AUTH-07 — JS Bridge only, no WebSocket', () => {
  it('LoginUIBridge lives in ui/ (same document)', () => {
    expect(existsSync(BRIDGE), 'poc3/src/ui/login-ui-bridge.ts').toBe(true);
  });

  it('LoginUIBridge does not open a WebSocket', () => {
    expect(existsSync(BRIDGE), 'poc3/src/ui/login-ui-bridge.ts').toBe(true);
    const src = readFileSync(BRIDGE, 'utf8');
    expect(src).not.toMatch(/WebSocket|new WebSocket/);
  });
});
