/**
 * Naming: .docs3/specs/auth/AUTH-03.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-03
 * Decision(s): D19
 * Tags       : tag_g_auth tag_s_auth_manager tag_s_scene_login_auth
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Sign in → Start"
 */

import { describe, it, expect } from 'vitest';

describe('AUTH-03 — Mock password always succeeds when fields non-empty', () => {
  it('non-empty username and password yield an AuthSession (mock)', () => {
    // given: AuthManager + mock/local adapter
    // when: trySignIn with both fields non-empty
    // then: session is set and SceneManager.mount(Start)
    expect(true).toBe(false);
  });

  it.todo('empty username or password does not succeed');

  it.todo('success never transitions to Title (D19 — Start only)');
});
