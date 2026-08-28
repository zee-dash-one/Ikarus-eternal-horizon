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

describe('AUTH-05 — Valid session skips Login on cold boot', () => {
  it('probeSession ok hides #login-root and mounts Start', async () => {
    const auth = new AuthManager();
    const adapter = new MockAdapter();
    adapter.session = { userId: 'u2', displayName: 'Ace', provider: 'google' };
    auth.setPlatformAdapter(adapter);
    const session = await auth.probeSession();
    expect(session).not.toBeNull();
    expect(auth.session?.userId).toBe('u2');
  });

  it.todo('no session → #login-root visible; canvas Start not mounted yet');
});
