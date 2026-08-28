/**
 * Naming: .docs3/specs/scenes/SCENE-01.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/scenes.spec.MD → SCENE-01
 * Decision(s): D19 D41 D23
 * Tags       : tag_g_scene_flow tag_s_scene_login_auth tag_s_scene_login_ui
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM (gate; Start is canvas after success)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Auth → **Start**; skip path boots straight to Start"
 */

import { describe, it, expect } from 'vitest';

describe('SCENE-01 — Login gate before canvas Start', () => {
  it('cold boot with AuthSession mounts Start and skips Login', () => {
    // given: probeSession() returns a session
    // when: boot
    // then: SceneManager.mount(Start); #login-root hidden
    expect(true).toBe(false);
  });

  it('cold boot without session shows #login-root; mock sign-in → Start', () => {
    // given: probeSession() returns null
    // when: mock password succeeds
    // then: hide Login; mount Start (never Title)
    expect(true).toBe(false);
  });

  it.todo('Google button opens a new tab; shell stays on Login until probe ok');
});
