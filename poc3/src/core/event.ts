export type DomainEvent =
  | { readonly type: 'auth_session_changed'; readonly userId: string | null }
  | { readonly type: 'scene_changed'; readonly sceneId: string }
  | { readonly type: 'damage_applied'; readonly targetId: string; readonly amount: number }
  | { readonly type: 'integrity_state_changed'; readonly state: string }
  | { readonly type: 'sound_cue'; readonly cue: string }

export interface EventBus {
  publish(event: DomainEvent): void
  drain(): readonly DomainEvent[]
}

export function createEventBus(): EventBus {
  const queue: DomainEvent[] = []
  return {
    publish(event: DomainEvent): void {
      queue.push(event)
    },
    drain(): readonly DomainEvent[] {
      const out = queue.slice()
      queue.length = 0
      return out
    },
  }
}
