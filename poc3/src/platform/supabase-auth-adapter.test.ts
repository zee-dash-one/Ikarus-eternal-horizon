import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn(), signOut: vi.fn(),
  api: vi.fn(),
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: mocks }) }))
vi.mock('./api-client.ts', () => ({ configureApi: vi.fn(), apiRequest: mocks.api }))
import { SupabaseAuthAdapter } from './supabase-auth-adapter.ts'
import { assertPublicSupabaseConfig } from '../../../shared/auth-config.ts'
const key = 'sb_publishable_configuration_example'
function adapter() { return new SupabaseAuthAdapter('https://project.supabase.co', key, 'https://api.example.test', 'https://game.example.test/') }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'jwt' } }, error: null })
  mocks.signInWithPassword.mockResolvedValue({ error: null })
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
  mocks.signInWithOAuth.mockResolvedValue({ error: null })
  mocks.signOut.mockResolvedValue({ error: null })
  mocks.api.mockResolvedValue(new Response(JSON.stringify({ userId: 'account', displayName: 'Pilot', provider: 'email' })))
})
it('passes password to the provider and resolves identity through the verified API', async () => {
  const auth = adapter()
  expect(await auth.signInWithEmail('pilot@example.test', 'strong-password')).toMatchObject({ userId: 'account', provider: 'email' })
  expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'pilot@example.test', password: 'strong-password' })
  expect(mocks.api).toHaveBeenCalledWith('/api/me')
})
it('registers with a confirmation redirect and rejects a provider with auto-confirmation disabled in code policy', async () => {
  const auth = adapter()
  await auth.signUpWithEmail('pilot@example.test', 'strong-password')
  expect(mocks.signUp).toHaveBeenCalledWith({ email: 'pilot@example.test', password: 'strong-password', options: { emailRedirectTo: 'https://game.example.test/' } })
  mocks.signUp.mockResolvedValueOnce({ data: { session: { access_token: 'unexpected-auto-login' } }, error: null })
  await expect(auth.signUpWithEmail('pilot@example.test', 'strong-password')).rejects.toThrow(/confirmação/)
  expect(mocks.signOut).toHaveBeenCalled()
})
it('uses Google OAuth with a configured callback and cannot authorize a rejected API session', async () => {
  const auth = adapter()
  await auth.startGoogleSignIn()
  expect(mocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://game.example.test/' } })
  mocks.api.mockResolvedValueOnce(new Response('{}', { status: 401 }))
  expect(await auth.probeSession()).toBeNull()
})
it('rejects secret/service_role keys and insecure endpoints before constructing the SDK', () => {
  const jwt = (role: string) => 'header.' + btoa(JSON.stringify({ role })) + '.signature'
  expect(() => assertPublicSupabaseConfig('https://project.supabase.co', jwt('service_role'))).toThrow(/service_role/)
  expect(() => assertPublicSupabaseConfig('https://project.supabase.co', 'sb_secret_dangerous')).toThrow()
  expect(() => assertPublicSupabaseConfig('http://project.supabase.co', key)).toThrow(/HTTPS/)
  expect(() => assertPublicSupabaseConfig('https://project.supabase.co', jwt('anon'))).not.toThrow()
})
