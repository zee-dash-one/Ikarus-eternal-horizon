import { describe, it, expect } from 'vitest';
import { DemoAuthAdapter } from '../../../poc3/src/platform/demo-auth-adapter.ts';

describe('AUTH-04 — Google opens new tab; shell stays on Login', () => {
  it('startGoogleSignIn returns an openUrl for window.open (web)', () => {
    const adapter = new DemoAuthAdapter('/api');
    const openUrl = adapter.getGoogleStartUrl();
    expect(openUrl).toBe('/api/auth/google/start');
  });

  it.todo('#login-root stays visible until probeSession() returns a session');

  it.todo('OAuth URL is DemoHost /api/auth/* (ARCH-05)');
});
