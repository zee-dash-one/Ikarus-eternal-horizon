/**
 * Squad (macro AI) tuning shared by EnemyGroup and EnemySquadManager.
 *
 * Lives outside balancer.ts to keep BALANCE free of import cycles, exactly like
 * the Warrior sheet: BALANCE.enemy.squad simply points at DEFAULT_SQUAD_CONFIG.
 */

export interface SquadConfig {
  /** Hard cap of simultaneously active groups. */
  readonly maxGroups: number
  /** Slots per group (also the slot buffer size). */
  readonly maxPerGroup: number
  /** Structural decisions per second (staggered off the render frame). */
  readonly tickHz: number
  /** Ships evaluated for affinity / migration on each structural tick. */
  readonly shipsPerTick: number
  /** Hard cap of simultaneous FURY (kamikaze) ships. */
  readonly maxFury: number

  readonly circleRadius: number
  readonly vSpacing: number
  readonly vAngleDeg: number
  readonly diamondW: number
  readonly diamondH: number
  /** Damp λ used when a ship's slot offset is re-indexed (no snapping). */
  readonly slotLerpRate: number

  readonly groupMaxSpeed: number
  readonly groupMaxForce: number
  readonly groupArriveRadius: number
  /** Damp λ easing the group heading toward its travel direction. */
  readonly groupTurnLambda: number
  readonly groupSeparationRadius: number
  readonly groupSeparationWeight: number

  /** Random patrol target countdown window (ms). */
  readonly targetHoldMinMs: number
  readonly targetHoldMaxMs: number
  /** Member loss fraction that flips a group to Aggressive Intercept. */
  readonly casualtyPct: number
  /** Patrol Z band relative to the player (negative = ahead of the ship). */
  readonly patrolZMin: number
  readonly patrolZMax: number
  /**
   * Closest Z gap a patrolling group may keep in front of the player.
   * Groups never aim closer than `playerZ - patrolStandoffZ` while still ahead.
   */
  readonly patrolStandoffZ: number
  /** How far a patrol waypoint advances along +Z from the group's current Z. */
  readonly patrolAdvanceMin: number
  readonly patrolAdvanceMax: number
  /**
   * FURY dive (solo ship): how far past the player (+Z) the locked lane aims
   * after the peel-off attack, so the ship continues straight instead of parking.
   */
  readonly egressZMin: number
  readonly egressZMax: number
  /**
   * Chance (0..1), rolled once when a FURY ship crosses the player's Z,
   * to turn around and re-enter the combat band ahead of the ship.
   */
  readonly turnaroundChance: number
  /** Extra +Z push past the player when a damaged group goes intercept. */
  readonly interceptStandoffZ: number

  /** Ship-relative half width of the visible arena used for containment. */
  readonly arenaHalfX: number
  readonly containmentInsetX: number
  readonly containmentExp: number
  readonly containmentWeight: number

  /** Outer-radius speed bonus during group turns (time-of-arrival sync). */
  readonly curvatureScale: number

  /** A ship joins an existing group only within this distance. */
  readonly joinRadius: number
  readonly shipSeparationRadius: number
  readonly shipSeparationWeight: number
  readonly rogueAvoidRadius: number
  readonly rogueAvoidWeight: number

  /**
   * FLEE: how far toward spawn (−Z) the escape point sits from the ship's
   * current Z. Combined with the locked X-edge this is a diagonal peel, not a
   * straight +Z run.
   */
  readonly fleeBackZ: number
  /** Extra |X| past the arena wall so a fleeing ship actually leaves the field. */
  readonly fleeEdgePaddingX: number
}

/** Mutable debugger copy. */
export type EditableSquadConfig = {
  -readonly [K in keyof SquadConfig]: SquadConfig[K]
}

export const DEFAULT_SQUAD_CONFIG: SquadConfig = {
  maxGroups: 6,
  maxPerGroup: 6,
  tickHz: 5,
  shipsPerTick: 6,
  maxFury: 4,

  circleRadius: 7,
  vSpacing: 4,
  vAngleDeg: 35,
  diamondW: 8,
  diamondH: 6,
  slotLerpRate: 4,

  groupMaxSpeed: 7,
  groupMaxForce: 12,
  groupArriveRadius: 8,
  groupTurnLambda: 2.5,
  groupSeparationRadius: 26,
  groupSeparationWeight: 8,

  targetHoldMinMs: 3000,
  targetHoldMaxMs: 5000,
  casualtyPct: 0.5,
  patrolZMin: -60,
  patrolZMax: -30,
  patrolStandoffZ: 20,
  patrolAdvanceMin: 10,
  patrolAdvanceMax: 25,
  egressZMin: 28,
  egressZMax: 72,
  turnaroundChance: 0.15,
  interceptStandoffZ: 20,

  arenaHalfX: 34,
  containmentInsetX: 8,
  containmentExp: 3,
  containmentWeight: 12,

  curvatureScale: 0.6,

  joinRadius: 60,
  shipSeparationRadius: 2.6,
  shipSeparationWeight: 6,
  rogueAvoidRadius: 6,
  rogueAvoidWeight: 10,

  fleeBackZ: 15,
  fleeEdgePaddingX: 35,
}

export function cloneSquadConfig(src: SquadConfig | EditableSquadConfig): EditableSquadConfig {
  return { ...src }
}
