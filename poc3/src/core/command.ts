import type { InputScheme } from './input-types.ts'

export type Command =
  | { readonly type: 'input_scheme'; readonly scheme: InputScheme }
  | { readonly type: 'pause_toggle' }
  | { readonly type: 'scene_mount'; readonly sceneId: string }
  | { readonly type: 'auth_sign_in'; readonly username: string; readonly password: string }
  | { readonly type: 'auth_sign_out' }
  | { readonly type: 'free_cam_toggle'; readonly enabled: boolean }

export interface CommandBus {
  enqueue(command: Command): void
  drain(): readonly Command[]
}

export function createCommandBus(): CommandBus {
  const queue: Command[] = []
  return {
    enqueue(command: Command): void {
      queue.push(command)
    },
    drain(): readonly Command[] {
      const out = queue.slice()
      queue.length = 0
      return out
    },
  }
}
