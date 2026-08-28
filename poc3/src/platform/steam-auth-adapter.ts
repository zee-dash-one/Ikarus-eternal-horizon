import type { AuthPlatformAdapter } from './auth-types.ts'

export class SteamAuthAdapter implements AuthPlatformAdapter {
  async probeSession(): Promise<null> {
    return null
  }

  async trySignIn(): Promise<null> {
    return null
  }

  signInWithGoogle(): void {
    /* steam stub */
  }

  async signOut(): Promise<void> {
    /* steam stub */
  }
}
