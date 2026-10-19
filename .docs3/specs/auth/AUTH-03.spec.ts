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
  readonly capabilities = { email: true, google: false, mock: true }
  session: AuthSession | null = null;
  async probeSession(): Promise<AuthSession | null> {
    return this.session;
  }
  async signInWithEmail(email: string): Promise<AuthSession> {
    if (!email.includes('@')) throw new Error('Invalid email');
    this.session = { userId: 'u1', displayName: 'pilot', provider: 'mock' };
    return this.session;
  }
  signInWithGoogle(): void {}
  async signOut(): Promise<void> {
    this.session = null;
  }
}

describe('AUTH-03 — DEV email mock uses the injected adapter (D47)', () => {
  it('valid email yields a server adapter AuthSession', async () => {
    const auth = new AuthManager();
    const adapter = new MockAdapter();
    auth.setPlatformAdapter(adapter);
    const session = await auth.signInWithEmail('pilot@example.com');
    expect(session).not.toBeNull();
    expect(session?.displayName).toBe('pilot');
    expect(auth.session?.displayName).toBe('pilot');
  });

  it.todo('malformed email never calls the adapter');

  it.todo('success never transitions to Title (D19 — Start only)');
});
