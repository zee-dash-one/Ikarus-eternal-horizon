import { assertPublicSupabaseConfig } from '../../shared/auth-config.ts'
import { createClient } from '@supabase/supabase-js'
import type { AppConfig } from './config.ts'
import type { LocalRepository, PublicSession } from './repository.ts'

export class AuthServiceUnavailable extends Error {}
export interface ProductionAuth { resolve(token: string): Promise<PublicSession | null> }
export function createProductionAuth(config: AppConfig, repository: LocalRepository, now: () => number): ProductionAuth | null {
  if (config.profile !== 'production' || !config.supabaseUrl || !config.supabasePublishableKey) return null
  assertPublicSupabaseConfig(config.supabaseUrl, config.supabasePublishableKey)
  const client = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(10000) }) },
  })
  return { async resolve(token) {
    // getUser verifies with Auth service; never authorize using a decoded browser payload.
    const { data, error } = await client.auth.getUser(token)
    if (error && ((error.status ?? 0) === 0 || (error.status ?? 0) >= 500)) throw new AuthServiceUnavailable('Authentication service unavailable')
    if (error || !data.user || !data.user.email_confirmed_at) return null
    const user = data.user
    if (!user.id || user.id.length > 128) return null
    return repository.resolveExternal(user.id, user.app_metadata.provider === 'google' ? 'google' : 'email', now())
  } }
}
