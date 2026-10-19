import { DemoAuthAdapter } from './demo-auth-adapter.ts'
import type { AuthPlatformAdapter } from './auth-types.ts'
import { HttpProfileStore } from '../persist/profile-store.ts'
import type { ProfileStore } from '../persist/profile-store.ts'

export interface PlatformKit {
  readonly id: 'demo' | 'itch' | 'poki' | 'steam'
  readonly auth: AuthPlatformAdapter
  readonly createProfileStore?: (userId: string) => ProfileStore
}

export function createDemoKit(): PlatformKit {
  return {
    id: 'demo',
    auth: new DemoAuthAdapter('/api', import.meta.env.DEV && import.meta.env.VITE_AUTH_PROFILE === 'dev'),
    createProfileStore: (userId) => new HttpProfileStore(userId),
  }
}
