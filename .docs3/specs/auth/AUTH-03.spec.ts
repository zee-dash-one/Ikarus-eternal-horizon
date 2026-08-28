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

describe('AUTH-03 — Mock password always succeeds when fields non-empty', () => {
  it('non-empty username and password yield an AuthSession (mock)', async () => {
    const auth = new AuthManager();
    const adapter = new MockAdapter();
    auth.setPlatformAdapter(adapter);
    const session = await auth.trySignIn('pilot', 'secret');
    expect(session).not.toBeNull();
    expect(session?.displayName).toBe('pilot');
    expect(auth.session?.displayName).toBe('pilot');
  });

  it.todo('empty username or password does not succeed');

  it.todo('success never transitions to Title (D19 — Start only)');
});
