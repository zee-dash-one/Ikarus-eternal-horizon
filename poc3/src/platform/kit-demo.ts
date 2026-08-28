import { DemoAuthAdapter } from './demo-auth-adapter.ts'
import type { AuthPlatformAdapter } from './auth-types.ts'

export interface PlatformKit {
  readonly id: 'demo' | 'itch' | 'poki' | 'steam'
  readonly auth: AuthPlatformAdapter
}

export function createDemoKit(): PlatformKit {
  return {
    id: 'demo',
    auth: new DemoAuthAdapter(),
  }
}
