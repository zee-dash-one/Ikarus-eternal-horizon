/**
 * #tag/arch #tag/enemies #tag/ship
 *
 * Card:         DeathTrigger (ship death bus — enemy + player)
 * Hub:          .docs/plans/planning.spec.MD §5 G10/F05 · §6.1 (DoD)
 * Requirements: SHIP-02, WPN-02, RUL-11, RUL-12, RUL-13
 * Change type:  new
 * POC-1 origin: none
 * Test file:    poc2/src/systems/death-trigger.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      The one place a ship death (Enemy `killed` or player `destroyed`)
 *            becomes feedback + bookkeeping. Plays the explosion SFX cue,
 *            fires the explosion VFX placeholder, records a readable cause
 *            from the hitting Layer, appends common-enemy kills to a log,
 *            awards player score only for player laser / player ram, and
 *            erases the corpse after BALANCE.vfx.corpseMs (800).
 * Does not own: applyDamage (F04), pool implementation (E05/A05), Howler
 *            samples, particle meshes (F05 burst pool — this only calls a port).
 *            G10 RunState still owns ending the run; this trigger only hides
 *            the player mesh after the linger.
 * Player-facing: a dead gunship (or the player) pops, the cause is stored,
 *            credited kills tick score from 0, the wreck is gone after 0.8s.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Upstream:
 *   SDD-A01 Balancer — score.enemy, vfx.corpseMs
 *   SDD-F04 DamageResolver — killed / destroyed + source Layer
 *   §7 SoundManager — playExplosionCue()
 *   SDD-E05 EnemyManager — delayed pool release while dying
 *
 * Downstream:
 *   SDD-F03 DifficultyManager — reads kills from this trigger
 *   SDD-G10 RunState — later consumes score / player destroyed
 *   SDD-F05 VfxManager — later replaces ExplosionVfxPort
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : 2026-08-26  death bus; linger 800ms; player credit
 * Programming  : 2026-08-26  DeathTrigger + corpse slots; no GPU
 * Game Design  : 2026-08-26  cause labels; score only on player shot/ram
 * TDD          : 2026-08-26  death-trigger.test.ts
 *
 * Status: implemented
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

import type { Layer } from '../../poc2/src/systems/layers'
import type { DamageSink } from '../../poc2/src/systems/damage-resolver'

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
  readonly kind: 'killed' | 'destroyed'
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

export declare function deathCauseId(victim: Layer, source: Layer): DeathCauseId
export declare function deathCauseLabel(id: DeathCauseId): string
export declare function isPlayerKillCredit(source: Layer): boolean

export declare class DeathTrigger {
  constructor(options: DeathTriggerOptions)
  readonly kills: number
  readonly score: number
  readonly killLog: readonly KillRecord[]
  handle(event: DeathEventLike): void
  update(dt: number): void
  reset(): void
  dispose(): void
}

// ─── 3. Key fields ───────────────────────────────────────────────────────────
/**
 *   kills     | common enemies killed this run (meteor/player deaths excluded)
 *   score     | starts at 0; += BALANCE.score.enemy only on player shot/ram
 *   killLog   | readable cause per common-enemy death
 *   handle    — sfx + vfx + log/score + schedule erase at corpseMs
 *   update    — tick corpse timers; erase when remaining <= 0
 */

// ─── 5. Rules ────────────────────────────────────────────────────────────────
/**
 *   R1. handle('killed') on Layer.Enemy: explosion cue, explosion vfx, log entry,
 *       kills += 1. Score only if source is PlayerShot or Player.
 *   R2. handle('destroyed') on the player: explosion cue + vfx + schedule erase.
 *       Does not increment kills or score.
 *   R3. Cause is derived from (victim layer, source layer); labels are stable English.
 *   R4. Corpse erase is BALANCE.vfx.corpseMs after handle (800). begin() on handle,
 *       erase() when the timer elapses. Enemy stays visible (dying) until erase.
 *   R5. Numbers from BALANCE (score.enemy, corpseMs). No point literals.
 *   R6. handle while already dying / duplicate sink in the corpse list is ignored.
 *   R7. Per-frame update: no alloc (preallocated corpse slots).
 *   R8. Does not call applyDamage, Howler, or `new` THREE meshes.
 *   R9. Meteor killing an enemy logs the death but awards 0 score.
 *   R10. reset() zeroes kills, score, log, pending corpses (erase leftover).
 */

// ─── 6. View ─────────────────────────────────────────────────────────────────
/**
 * Visual:      none here — ExplosionVfxPort is the animation hook (placeholder).
 *              Enemy dying keeps the gunship mesh visible until erase.
 * syncRender:  N/A
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

/**
 *   BALANCE.vfx.corpseMs = 800
 *   BALANCE.score.enemy  = 100   // awarded only for player laser / player ram
 *
 * Causes (source → label):
 *   PlayerShot → player laser
 *   Player     → player ram
 *   EnemyShot  vs player → enemy shot; vs enemy → friendly fire
 *   Enemy      vs player → enemy ram
 *   Meteor     → asteroid
 *
 * Feel: wreck lingers just long enough to read the pop, then the slot frees.
 * Score starts at 0 every run. Difficulty still reads kills (all common deaths).
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * File: poc2/src/systems/death-trigger.test.ts
 *
 * describe('deathCauseId')
 *   it('maps player shot/ram, enemy shot/ram, meteor and friendly fire')
 *
 * describe('DeathTrigger')
 *   it('starts at zero kills and zero score')
 *   it('enemy killed by player shot plays explosion cue and vfx, logs, scores')
 *   it('enemy killed by player ram scores and logs player ram')
 *   it('enemy killed by meteor logs asteroid with zero score')
 *   it('player destroyed plays explosion and does not increment kills or score')
 *   it('erases the corpse after BALANCE.vfx.corpseMs')
 *   it('ignores a second handle on the same dying sink')
 *   it('update allocates no objects')
 */
