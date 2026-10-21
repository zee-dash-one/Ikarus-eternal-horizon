import { assertPublicSupabaseConfig } from '../../../shared/auth-config.ts'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { apiRequest, configureApi } from './api-client.ts'
import type { AuthPlatformAdapter, AuthSession } from './auth-types.ts'

/** Provider SDK holds the session; the game API authorizes with getUser on its server. */
export class SupabaseAuthAdapter implements AuthPlatformAdapter {
  readonly capabilities = { email: true, google: true, password: true, mock: false }
  readonly client: SupabaseClient
  constructor(url: string, publishableKey: string, apiUrl: string, private readonly _redirectTo: string) {
    if (!url || !publishableKey || !apiUrl) throw new Error('Configure Supabase Auth e a URL da API para este build.')
    assertPublicSupabaseConfig(url, publishableKey)
    this.client = createClient(url, publishableKey, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
    configureApi(apiUrl, async () => (await this.client.auth.getSession()).data.session?.access_token ?? null)
  }
  async probeSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession()
    if (error) throw new Error('Não foi possível recuperar sua sessão. Entre novamente.')
    if (!data.session) return null
    const response = await apiRequest('/api/me')
    if (response.status === 401) return null
    return response.json() as Promise<AuthSession>
  }
  async signInWithEmail(email: string, password?: string): Promise<AuthSession> {
    if (!password) throw new Error('Informe sua senha.')
    const { error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw new Error('Email/senha inválidos ou email ainda não confirmado.')
    const session = await this.probeSession()
    if (!session) throw new Error('Confirme o email antes de entrar.')
    return session
  }
  async signUpWithEmail(email: string, password: string): Promise<void> {
    if (password.length < 8 || password.length > 128) throw new Error('A senha deve ter entre 8 e 128 caracteres.')
    const { data, error } = await this.client.auth.signUp({ email, password, options: { emailRedirectTo: this._redirectTo } })
    if (error) throw new Error('Não foi possível criar a conta. Confira os dados ou tente mais tarde.')
    if (data.session) {
      await this.client.auth.signOut()
      throw new Error('A confirmação de email precisa estar habilitada no provedor antes de publicar o jogo.')
    }
  }
  async startGoogleSignIn(): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: this._redirectTo } })
    if (error) throw new Error('Não foi possível abrir o login do Google.')
  }
  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw new Error('Não foi possível sair. Tente novamente.')
  }
}
