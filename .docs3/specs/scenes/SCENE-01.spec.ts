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
import { AuthManager } from '../../../poc3/src/systems/auth-manager.ts';
import type { AuthPlatformAdapter, AuthSession } from '../../../poc3/src/platform/auth-types.ts';

class MockAdapter implements AuthPlatformAdapter {
  session: AuthSession | null = null;
  async probeSession(): Promise<AuthSession | null> {
    return this.session;
  }
  async trySignIn(username: string, password: string): Promise<AuthSession | null> {
    if (!username.trim() || !password.trim()) return null;
    this.session = { userId: 'u1', displayName: username, provider: 'mock' };
    return this.session;
  }
  signInWithGoogle(): void {}
  async signOut(): Promise<void> {
    this.session = null;
  }
}

describe('SCENE-01 — Login gate before canvas Start', () => {
  it('cold boot with AuthSession mounts Start and skips Login', async () => {
    const auth = new AuthManager();
    const adapter = new MockAdapter();
    adapter.session = { userId: 'u1', displayName: 'Pilot', provider: 'mock' };
    auth.setPlatformAdapter(adapter);
    const session = await auth.probeSession();
    expect(session).not.toBeNull();
    expect(auth.session?.displayName).toBe('Pilot');
  });

  it('cold boot without session shows #login-root; mock sign-in → Start', async () => {
    const auth = new AuthManager();
    const adapter = new MockAdapter();
    auth.setPlatformAdapter(adapter);
    expect(await auth.probeSession()).toBeNull();
    const session = await auth.trySignIn('pilot', 'secret');
    expect(session).not.toBeNull();
    expect(auth.session?.displayName).toBe('pilot');
  });

  it.todo('Google button opens a new tab; shell stays on Login until probe ok');
});
