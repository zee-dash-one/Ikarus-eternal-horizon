import type { AuthPlatformAdapter } from './auth-types.ts'

/** Production provider not configured yet. Never fall back to a mock identity. */
export class PokiAuthAdapter implements AuthPlatformAdapter {
  readonly capabilities = { email: false, google: false, mock: false }
  async probeSession(): Promise<null> { return null }
  async signInWithEmail(): Promise<never> { throw new Error('Provider not configured') }
  async signOut(): Promise<void> { /* no session */ }
}