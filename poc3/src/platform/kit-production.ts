import type { PlatformKit } from './kit-demo.ts'
import { SupabaseAuthAdapter } from './supabase-auth-adapter.ts'
import { HttpProfileStore } from '../persist/profile-store.ts'
import { DemoRankingAdapter } from './demo-ranking-adapter.ts'

export function createProductionKit(): PlatformKit {
  return {
    id: 'web',
    auth: new SupabaseAuthAdapter(import.meta.env.VITE_SUPABASE_URL ?? '', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '', import.meta.env.VITE_API_URL ?? '', new URL(import.meta.env.BASE_URL, window.location.href).href),
    createProfileStore: (userId) => new HttpProfileStore(userId),
    createRankingAdapter: (userId) => new DemoRankingAdapter(userId),
  }
}
