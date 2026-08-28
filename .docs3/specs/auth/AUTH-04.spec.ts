/**
 * Naming: .docs3/specs/auth/AUTH-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-04
 * Decision(s): D41 D38
 * Tags       : tag_g_auth tag_s_auth_adapter_demo tag_s_auth_ui
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Demo: DemoHost OAuth (`D38`/`ARCH-05`)"
 */

import { describe, it, expect } from 'vitest';

describe('AUTH-04 — Google opens new tab; shell stays on Login', () => {
  it('startGoogleSignIn returns an openUrl for window.open (web)', () => {
    // given: DemoAuthAdapter
    // when: startGoogleSignIn()
    // then: { openUrl } — shell does not navigate away from #login-root
    expect(true).toBe(false);
  });

  it.todo('#login-root stays visible until probeSession() returns a session');

  it.todo('OAuth URL is DemoHost /api/auth/* (ARCH-05)');
});
