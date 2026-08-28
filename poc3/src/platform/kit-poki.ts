import { PokiAuthAdapter } from './poki-auth-adapter.ts'
import type { PlatformKit } from './kit-demo.ts'

export function createPokiKit(): PlatformKit {
  return {
    id: 'poki',
    auth: new PokiAuthAdapter(),
  }
}
