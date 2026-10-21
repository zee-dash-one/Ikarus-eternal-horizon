export interface AuthSession {
  readonly userId: string
  readonly displayName: string
  readonly provider: 'mock' | 'email' | 'google' | 'steam'
}

export interface AuthCapabilities {
  readonly password?: boolean
  readonly email: boolean
  readonly google: boolean
  readonly mock: boolean
}

export interface AuthPlatformAdapter {
  readonly capabilities: AuthCapabilities
  probeSession(): Promise<AuthSession | null>
  signInWithEmail(email: string, password?: string): Promise<AuthSession>
  signUpWithEmail?(email: string, password: string): Promise<void>
  startGoogleSignIn?(): void | Promise<void>
  signOut(): Promise<void>
}
