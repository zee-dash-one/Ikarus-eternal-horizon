import type { RunScoreEvent } from './run-score-event.ts'

export type DomainEvent = RunScoreEvent
  | { readonly type: 'PlayerEntryCompleted' }
  | { readonly type: 'SprintStarted'; readonly sprintIndex: number; readonly sectorId: string }
  | { readonly type: 'WaveStarted'; readonly sprintIndex: number; readonly waveIndex: number; readonly miniboss: boolean }
  | { readonly type: 'SprintTransition'; readonly sprintIndex: number }
  | { readonly type: 'drop_requested'; readonly sourceId: string; readonly source: 'enemy' | 'meteor'; readonly rank?: 'miniboss'; readonly x: number; readonly z: number }
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
