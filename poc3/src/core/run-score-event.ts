/** IDs identify one destruction, not a reusable pool slot. No points for despawn/retreat. */
export type RunScoreEvent =
  | { readonly type: 'enemy_destroyed'; readonly eventId: string; readonly kind: 'enemy' | 'miniboss'; readonly creditedToPlayer: boolean }
  | { readonly type: 'meteor_destroyed'; readonly eventId: string; readonly size: 'S' | 'M' | 'L'; readonly creditedToPlayer: boolean }
