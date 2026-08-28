import { SteamAuthAdapter } from './steam-auth-adapter.ts'
import type { PlatformKit } from './kit-demo.ts'

export function createSteamKit(): PlatformKit {
  return {
    id: 'steam',
    auth: new SteamAuthAdapter(),
  }
}
