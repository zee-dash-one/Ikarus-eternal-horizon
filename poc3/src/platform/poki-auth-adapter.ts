import type { AuthPlatformAdapter } from './auth-types.ts'

export class PokiAuthAdapter implements AuthPlatformAdapter {
  async probeSession(): Promise<null> {
    return null
  }

  async trySignIn(): Promise<null> {
    return null
  }

  signInWithGoogle(): void {
    /* poki stub */
  }

  async signOut(): Promise<void> {
    /* poki stub */
  }
}
