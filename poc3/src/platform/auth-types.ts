export interface AuthSession {
  readonly userId: string
  readonly displayName: string
  readonly provider: 'mock' | 'google' | 'steam'
}

export interface AuthPlatformAdapter {
  probeSession(): Promise<AuthSession | null>
  trySignIn(username: string, password: string): Promise<AuthSession | null>
  signInWithGoogle(): void
  signOut(): Promise<void>
}
