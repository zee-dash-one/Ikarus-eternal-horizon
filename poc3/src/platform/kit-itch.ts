import { ItchAuthAdapter } from './itch-auth-adapter.ts'
import type { PlatformKit } from './kit-demo.ts'

export function createItchKit(): PlatformKit {
  return {
    id: 'itch',
    auth: new ItchAuthAdapter(),
  }
}
