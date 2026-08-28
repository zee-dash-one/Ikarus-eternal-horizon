/**
 * Naming: .docs3/specs/auth/AUTH-06.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-06
 * Decision(s): D41 D37
 * Tags       : tag_g_auth tag_s_auth_platform_adapter tag_s_auth_adapter_demo
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Demo=`DemoAuthAdapter`; no cross-SDK imports"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEMO = resolve(REPO_ROOT, 'poc3/src/platform/demo-auth-adapter.ts');
const KIT_DEMO = resolve(REPO_ROOT, 'poc3/src/platform/kit-demo.ts');
const KIT_POKI = resolve(REPO_ROOT, 'poc3/src/platform/kit-poki.ts');
const AUTH_MGR = resolve(REPO_ROOT, 'poc3/src/systems/auth-manager.ts');

describe('AUTH-06 — One AuthPlatformAdapter per build', () => {
  it('DemoAuthAdapter module exists and kit-demo wires it', () => {
    expect(existsSync(DEMO), 'poc3/src/platform/demo-auth-adapter.ts').toBe(true);
    expect(existsSync(KIT_DEMO), 'poc3/src/platform/kit-demo.ts').toBe(true);
    expect(readFileSync(KIT_DEMO, 'utf8')).toMatch(/DemoAuthAdapter/);
  });

  it('AuthManager does not import host SDKs', () => {
    expect(existsSync(AUTH_MGR), 'poc3/src/systems/auth-manager.ts').toBe(true);
    const src = readFileSync(AUTH_MGR, 'utf8');
    expect(src).not.toMatch(/PokiSDK|steamworks|@tauri-apps/);
  });

  it('Poki kit does not import DemoAuthAdapter or Steam adapter', () => {
    expect(existsSync(KIT_POKI), 'poc3/src/platform/kit-poki.ts').toBe(true);
    const src = readFileSync(KIT_POKI, 'utf8');
    expect(src).not.toMatch(/DemoAuthAdapter|SteamAuthAdapter/);
  });
});
