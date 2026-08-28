/**
 * Naming: .docs3/specs/auth/AUTH-05.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/login.spec.MD → AUTH-05
 * Decision(s): D19 D41
 * Tags       : tag_g_auth tag_s_scene_login_auth tag_s_auth_manager
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Start mounts without Login flash (≤1 frame)"
 */

import { describe, it, expect } from 'vitest';

describe('AUTH-05 — Valid session skips Login on cold boot', () => {
  it('probeSession ok hides #login-root and mounts Start', () => {
    // given: AuthManager.probeSession() resolves AuthSession
    // when: boot runs
    // then: #login-root hidden; SceneManager.mount(Start); Login flash ≤1 frame
    expect(true).toBe(false);
  });

  it.todo('no session → #login-root visible; canvas Start not mounted yet');
});
