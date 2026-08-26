/**
 * Ship death bus — explosion cue/vfx, readable cause, kill log, player score, corpse linger.
 */

import { BALANCE } from '../core/balancer'
import { Layer } from './layers'
import type { DamageSink } from './damage-resolver'

export type DeathCauseId =
  | 'player-shot'
  | 'player-ram'
  | 'enemy-shot'
  | 'enemy-ram'
  | 'meteor'
  | 'friendly-shot'
  | 'unknown'

export interface KillRecord {
  readonly cause: DeathCauseId
  readonly causeLabel: string
  readonly source: Layer
  readonly scoreAwarded: number
}

export interface ExplosionVfxPort {
  playExplosion(x: number, z: number): void
}

export interface DeathCorpsePort {
  begin(sink: DamageSink): void
  erase(sink: DamageSink): void
}

export interface DeathEventLike {
  readonly kind: string
  readonly sink: DamageSink
  readonly source: Layer
}

export interface SoundExplosionPort {
  playExplosionCue(): void
}

export interface DeathTriggerOptions {
  readonly sound: SoundExplosionPort
  readonly vfx: ExplosionVfxPort
  readonly corpses: DeathCorpsePort
}

const CAUSE_LABEL: Record<DeathCauseId, string> = {
  'player-shot': 'player laser',
  'player-ram': 'player ram',
  'enemy-shot': 'enemy shot',
  'enemy-ram': 'enemy ram',
  meteor: 'asteroid',
  'friendly-shot': 'friendly fire',
  unknown: 'unknown',
}

export function deathCauseLabel(id: DeathCauseId): string {
  return CAUSE_LABEL[id]
}

export function isPlayerKillCredit(source: Layer): boolean {
  return source === Layer.PlayerShot || source === Layer.Player
}

export function deathCauseId(victim: Layer, source: Layer): DeathCauseId {
  if (source === Layer.PlayerShot) {
    return 'player-shot'
  }
  if (source === Layer.Player) {
    return 'player-ram'
  }
  if (source === Layer.Meteor) {
    return 'meteor'
  }
  if (source === Layer.EnemyShot) {
    return victim === Layer.Enemy ? 'friendly-shot' : 'enemy-shot'
  }
  if (source === Layer.Enemy) {
    return victim === Layer.Player ? 'enemy-ram' : 'friendly-shot'
  }
  return 'unknown'
}

function victimLayer(sink: DamageSink): Layer {
  const layer = (sink as { layer?: Layer }).layer
  return layer ?? Layer.Enemy
}

function poseOf(sink: DamageSink): { x: number; z: number } {
  const rec = sink as { x?: unknown; z?: unknown }
  return {
    x: typeof rec.x === 'number' ? rec.x : 0,
    z: typeof rec.z === 'number' ? rec.z : 0,
  }
}

interface CorpseSlot {
  sink: DamageSink | null
  remainingMs: number
}

export class SilentExplosionVfx implements ExplosionVfxPort {
  lastX = 0
  lastZ = 0
  lastCount = 0

  playExplosion(x: number, z: number): void {
    this.lastX = x
    this.lastZ = z
    this.lastCount += 1
  }
}

export class DeathTrigger {
  private readonly _sound: SoundExplosionPort
  private readonly _vfx: ExplosionVfxPort
  private readonly _corpses: DeathCorpsePort
  private readonly _log: KillRecord[] = []
  private readonly _slots: CorpseSlot[]
  private _kills = 0
  private _score = 0
  private _disposed = false

  constructor(options: DeathTriggerOptions) {
    this._sound = options.sound
    this._vfx = options.vfx
    this._corpses = options.corpses
    const cap = BALANCE.enemy.poolSize + 1
    this._slots = new Array<CorpseSlot>(cap)
    for (let i = 0; i < cap; i++) {
      this._slots[i] = { sink: null, remainingMs: 0 }
    }
  }

  get kills(): number {
    return this._kills
  }

  get score(): number {
    return this._score
  }

  get killLog(): readonly KillRecord[] {
    return this._log
  }

  handle(event: DeathEventLike): void {
    if (this._disposed) {
      return
    }
    if (event.kind !== 'killed' && event.kind !== 'destroyed') {
      return
    }
    if (this._hasCorpse(event.sink)) {
      return
    }
    const pose = poseOf(event.sink)
    this._sound.playExplosionCue()
    this._vfx.playExplosion(pose.x, pose.z)
    this._corpses.begin(event.sink)
    this._schedule(event.sink)

    if (event.kind === 'destroyed') {
      return
    }

    const victim = victimLayer(event.sink)
    if (victim !== Layer.Enemy) {
      return
    }
    const cause = deathCauseId(victim, event.source)
    const credit = isPlayerKillCredit(event.source)
    const awarded = credit ? BALANCE.score.enemy : 0
    if (credit) {
      this._score += awarded
    }
    this._kills += 1
    this._log.push({
      cause,
      causeLabel: deathCauseLabel(cause),
      source: event.source,
      scoreAwarded: awarded,
    })
  }

  update(dt: number): void {
    if (this._disposed) {
      return
    }
    const step = dt * 1000
    for (let i = 0; i < this._slots.length; i++) {
      const slot = this._slots[i]
      if (!slot.sink) {
        continue
      }
      slot.remainingMs -= step
      if (slot.remainingMs <= 0) {
        const sink = slot.sink
        slot.sink = null
        slot.remainingMs = 0
        this._corpses.erase(sink)
      }
    }
  }

  reset(): void {
    for (let i = 0; i < this._slots.length; i++) {
      const slot = this._slots[i]
      if (slot.sink) {
        this._corpses.erase(slot.sink)
      }
      slot.sink = null
      slot.remainingMs = 0
    }
    this._kills = 0
    this._score = 0
    this._log.length = 0
  }

  dispose(): void {
    if (this._disposed) {
      return
    }
    this.reset()
    this._disposed = true
  }

  private _hasCorpse(sink: DamageSink): boolean {
    for (let i = 0; i < this._slots.length; i++) {
      if (this._slots[i].sink === sink) {
        return true
      }
    }
    return false
  }

  private _schedule(sink: DamageSink): void {
    for (let i = 0; i < this._slots.length; i++) {
      const slot = this._slots[i]
      if (!slot.sink) {
        slot.sink = sink
        slot.remainingMs = BALANCE.vfx.corpseMs
        return
      }
    }
    this._corpses.erase(sink)
  }
}
