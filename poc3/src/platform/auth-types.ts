export interface AuthSession {
  readonly userId: string
  readonly displayName: string
  readonly provider: 'mock' | 'email' | 'google' | 'steam'
}

export interface AuthCapabilities {
  readonly email: boolean
  readonly google: boolean
  readonly mock: boolean
}

export interface AuthPlatformAdapter {
  readonly capabilities: AuthCapabilities
  probeSession(): Promise<AuthSession | null>
  signInWithEmail(email: string): Promise<AuthSession>
  startGoogleSignIn?(): void
  signOut(): Promise<void>
}
