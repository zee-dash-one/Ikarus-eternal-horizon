import type { AuthPlatformAdapter } from './auth-types.ts'

export class ItchAuthAdapter implements AuthPlatformAdapter {
  async probeSession(): Promise<null> {
    return null
  }

  async trySignIn(): Promise<null> {
    return null
  }

  signInWithGoogle(): void {
    /* itch stub */
  }

  async signOut(): Promise<void> {
    /* itch stub */
  }
}
