/**
 * SDD-F04 DamageResolver — HitPairs → applyDamage + events. Detect-only stays in F01.
 * Body ram: shield absorbs first. Player ↔ Enemy detonates the enemy.
 */

import { Layer, isBodyLayer, isShotLayer } from './layers'

export { Layer }

export interface DamageOutcome {
  readonly absorbedByShield: number
  readonly dealtToHull: number
  readonly shieldBroke: boolean
  readonly hullLevelChanged: boolean
  readonly destroyed: boolean
  readonly killed: boolean
}

export interface DamageSink {
  applyDamage(amount: number, source: Layer): DamageOutcome
}

export type DamageEventKind =
  | 'shieldHit'
  | 'hullHit'
  | 'shieldBroke'
  | 'killed'
  | 'destroyed'

export interface DamageEvent {
  readonly kind: DamageEventKind
  readonly sink: DamageSink
  readonly source: Layer
  readonly amount: number
  readonly outcome: DamageOutcome
}

export interface ShotDamagePort {
  readonly layer: Layer
  active: boolean
  effectiveDamage(): number
}

export interface ContactDamagePort {
  readonly layer: Layer
  readonly contactDamage: number
  readonly active: boolean
}

export interface HitPairLike {
  readonly a: { readonly layer: Layer; active: boolean }
  readonly b: { readonly layer: Layer; active: boolean }
  readonly aLayer: Layer
  readonly bLayer: Layer
}

export type DamageListener = (e: DamageEvent) => void

function isShot(o: unknown): o is ShotDamagePort {
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof (o as ShotDamagePort).effectiveDamage === 'function'
  )
}

function isContact(o: unknown): o is ContactDamagePort {
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof (o as ContactDamagePort).contactDamage === 'number'
  )
}

function isSink(o: unknown): o is DamageSink {
  return (
    typeof o === 'object' &&
    o !== null &&
    typeof (o as DamageSink).applyDamage === 'function'
  )
}

function isPlayerEnemyRam(a: Layer, b: Layer): boolean {
  return (a === Layer.Player && b === Layer.Enemy) || (a === Layer.Enemy && b === Layer.Player)
}

/** Shield + hull still on the object. Ram kill routes through applyDamage (shield first). */
function combatRemaining(o: unknown): number {
  if (typeof o !== 'object' || o === null) {
    return 0
  }
  const rec = o as { hp?: unknown; shield?: unknown }
  const hull = typeof rec.hp === 'number' ? rec.hp : 0
  const shield = typeof rec.shield === 'number' ? rec.shield : 0
  return Math.max(0, hull) + Math.max(0, shield)
}

export function damageAmount(pair: HitPairLike): number {
  const a = pair.a
  const b = pair.b
  if (isShotLayer(a.layer) && isShot(a)) {
    return a.effectiveDamage()
  }
  if (isShotLayer(b.layer) && isShot(b)) {
    return b.effectiveDamage()
  }
  if (isBodyLayer(a.layer) && isContact(a)) {
    return a.contactDamage
  }
  if (isBodyLayer(b.layer) && isContact(b)) {
    return b.contactDamage
  }
  return 0
}

export function sourceLayer(pair: HitPairLike): Layer {
  if (isShotLayer(pair.aLayer) || isBodyLayer(pair.aLayer)) {
    return pair.aLayer
  }
  if (isShotLayer(pair.bLayer) || isBodyLayer(pair.bLayer)) {
    return pair.bLayer
  }
  return pair.aLayer
}

export function sinkOf(pair: HitPairLike): DamageSink | null {
  if (pair.aLayer === Layer.Drop || pair.bLayer === Layer.Drop) {
    return null
  }
  if (isBodyLayer(pair.aLayer) && isBodyLayer(pair.bLayer)) {
    return null
  }
  const src = sourceLayer(pair)
  const other = pair.aLayer === src ? pair.b : pair.a
  if (other.layer === Layer.Drop) {
    return null
  }
  return isSink(other) ? other : null
}

function pairKey(pair: HitPairLike): string {
  const ia = (pair.a as { __cid?: number }).__cid ?? 0
  const ib = (pair.b as { __cid?: number }).__cid ?? 0
  return ia < ib ? `${ia}|${ib}` : `${ib}|${ia}`
}

export class DamageResolver {
  private readonly _listeners = new Set<DamageListener>()
  private readonly _events: DamageEvent[] = []
  private readonly _seen = new Set<string>()
  private readonly _scratchOutcome: {
    absorbedByShield: number
    dealtToHull: number
    shieldBroke: boolean
    hullLevelChanged: boolean
    destroyed: boolean
    killed: boolean
  } = {
    absorbedByShield: 0,
    dealtToHull: 0,
    shieldBroke: false,
    hullLevelChanged: false,
    destroyed: false,
    killed: false,
  }
  private _resolving = false
  private _eventLen = 0

  on(listener: DamageListener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }

  resolve(pairs: readonly HitPairLike[]): readonly DamageEvent[] {
    if (this._resolving) {
      throw new Error('DamageResolver.resolve re-entrancy is forbidden')
    }
    this._resolving = true
    this._seen.clear()
    this._eventLen = 0
    try {
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        if (!pair || !pair.a.active || !pair.b.active) {
          continue
        }
        if (pair.aLayer === Layer.Drop || pair.bLayer === Layer.Drop) {
          continue
        }
        const key = pairKey(pair)
        if (this._seen.has(key)) {
          continue
        }
        this._seen.add(key)

        if (isBodyLayer(pair.aLayer) && isBodyLayer(pair.bLayer)) {
          const fromA = isContact(pair.a) ? pair.a.contactDamage : 0
          const fromB = isContact(pair.b) ? pair.b.contactDamage : 0
          if (isPlayerEnemyRam(pair.aLayer, pair.bLayer)) {
            const enemyIsA = pair.aLayer === Layer.Enemy
            const enemyObj = enemyIsA ? pair.a : pair.b
            const playerObj = enemyIsA ? pair.b : pair.a
            const fromEnemy = enemyIsA ? fromA : fromB
            this._applyBodyContact(playerObj, fromEnemy, Layer.Enemy)
            this._applyBodyContact(enemyObj, combatRemaining(enemyObj), Layer.Player)
            continue
          }
          this._applyBodyContact(pair.b, fromA, pair.aLayer)
          this._applyBodyContact(pair.a, fromB, pair.bLayer)
          continue
        }

        const sink = sinkOf(pair)
        if (!sink) {
          continue
        }
        const amount = damageAmount(pair)
        if (amount <= 0) {
          continue
        }
        const source = sourceLayer(pair)
        this._applyToSink(sink, amount, source)
      }
    } finally {
      this._resolving = false
    }
    this._events.length = this._eventLen
    return this._events
  }

  resetFrame(): void {
    this._seen.clear()
  }

  private _applyBodyContact(
    sinkObj: HitPairLike['a'] | HitPairLike['b'],
    amount: number,
    source: Layer,
  ): void {
    if (!isSink(sinkObj) || amount <= 0) {
      return
    }
    this._applyToSink(sinkObj, amount, source)
  }

  private _applyToSink(sink: DamageSink, amount: number, source: Layer): void {
    const raw = sink.applyDamage(amount, source)
    const outcome = this._normalize(raw)
    this._emitFacets(sink, source, amount, outcome)
  }

  private _normalize(raw: DamageOutcome | Omit<DamageOutcome, 'killed'>): DamageOutcome {
    const killed = 'killed' in raw ? Boolean(raw.killed) : false
    this._scratchOutcome.absorbedByShield = raw.absorbedByShield
    this._scratchOutcome.dealtToHull = raw.dealtToHull
    this._scratchOutcome.shieldBroke = raw.shieldBroke
    this._scratchOutcome.hullLevelChanged = raw.hullLevelChanged
    this._scratchOutcome.destroyed = raw.destroyed
    this._scratchOutcome.killed = killed
    return {
      absorbedByShield: this._scratchOutcome.absorbedByShield,
      dealtToHull: this._scratchOutcome.dealtToHull,
      shieldBroke: this._scratchOutcome.shieldBroke,
      hullLevelChanged: this._scratchOutcome.hullLevelChanged,
      destroyed: this._scratchOutcome.destroyed,
      killed: this._scratchOutcome.killed,
    }
  }

  private _emitFacets(
    sink: DamageSink,
    source: Layer,
    amount: number,
    outcome: DamageOutcome,
  ): void {
    if (outcome.absorbedByShield > 0) {
      this._push('shieldHit', sink, source, amount, outcome)
    }
    if (outcome.dealtToHull > 0) {
      this._push('hullHit', sink, source, amount, outcome)
    }
    if (outcome.shieldBroke) {
      this._push('shieldBroke', sink, source, amount, outcome)
    }
    if (outcome.killed) {
      this._push('killed', sink, source, amount, outcome)
    }
    if (outcome.destroyed) {
      this._push('destroyed', sink, source, amount, outcome)
    }
  }

  private _push(
    kind: DamageEventKind,
    sink: DamageSink,
    source: Layer,
    amount: number,
    outcome: DamageOutcome,
  ): void {
    const event: DamageEvent = { kind, sink, source, amount, outcome }
    if (this._eventLen < this._events.length) {
      const slot = this._events[this._eventLen] as {
        kind: DamageEventKind
        sink: DamageSink
        source: Layer
        amount: number
        outcome: DamageOutcome
      }
      slot.kind = event.kind
      slot.sink = event.sink
      slot.source = event.source
      slot.amount = event.amount
      slot.outcome = event.outcome
    } else {
      this._events.push(event)
    }
    this._eventLen++
    for (const listener of this._listeners) {
      listener(event)
    }
  }
}
