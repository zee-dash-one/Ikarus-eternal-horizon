import { DemoAuthAdapter } from './demo-auth-adapter.ts'
import type { AuthPlatformAdapter } from './auth-types.ts'
import { HttpProfileStore } from '../persist/profile-store.ts'
import type { ProfileStore } from '../persist/profile-store.ts'
import { DemoRankingAdapter } from './demo-ranking-adapter.ts'
import type { RankingPlatformAdapter } from '../../../shared/rankings.ts'

export interface PlatformKit {
  readonly id: 'demo' | 'web' | 'itch' | 'poki' | 'steam'
  readonly auth: AuthPlatformAdapter
  readonly createProfileStore?: (userId: string) => ProfileStore
  readonly createRankingAdapter?: (userId: string) => RankingPlatformAdapter
}

export function createDemoKit(): PlatformKit {
  return {
    id: 'demo',
    auth: new DemoAuthAdapter('/api', import.meta.env.DEV && import.meta.env.VITE_AUTH_PROFILE === 'dev'),
    createProfileStore: (userId) => new HttpProfileStore(userId),
    createRankingAdapter: (userId) => new DemoRankingAdapter(userId),
  }
}
