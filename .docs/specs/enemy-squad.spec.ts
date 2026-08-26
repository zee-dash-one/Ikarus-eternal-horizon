/**
 * #tag/arch #tag/enemies #tag/ai
 *
 * Card:         SDD-E01 / SDD-E05 follow-on — Enemy squad (groups, formations, FURY cap)
 * Hub:          .docs/plans/planning.spec.MD §5 (E01, E05) · §6.1 (DoD)
 * Requirements: ENM-01, ENM-02, RUL-12, RUL-13
 * Change type:  new (composed inside existing E01 Enemy + E05 EnemyManager)
 * POC-1 origin: none
 * Test files:   poc2/src/systems/enemy-group.test.ts
 *               poc2/src/systems/enemy-squad-manager.test.ts
 *               poc2/src/systems/formation-slots.test.ts
 *               poc2/src/systems/steering.test.ts
 *               poc2/src/gameobjects/enemy/enemy.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      Post-gate enemy macro AI. Up to 6 pooled `EnemyGroup`s (center-free
 *            formations) orchestrated by `EnemySquadManager` inside EnemyManager.
 *            Per-ship states after birth: formation / boost / migrating / fury / flee.
 *            SquadConfig lives in systems/squad-config.ts and is pointed at by
 *            BALANCE.enemy.squad (no import cycle into balancer.ts).
 * Does not own: birth animation to EnemyGate (EnemyMovementManager), spawn cadence
 *            (EnemyManager SpawnAreas), BattleField cull, player damage.
 * Player-facing: groups close in, hold a Z standoff, peel-off kamikazes (capped),
 *            and fly off the near wall instead of parking on the player.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Upstream:
 *   SDD-A01 Balancer — BALANCE.enemy.squad, poolSize, spawn*.maxActive
 *   SDD-A03 Math     — distXZ, clamp, damp, lerp, dampAngle
 *   SDD-A05 ObjectPool — Enemy instances; groups are preallocated flags
 *   SDD-E01 Enemy    — SquadShipPort, birth → register
 *   SDD-E05 EnemyManager — owns EnemySquadManager; update order + cull
 *
 * Downstream:
 *   SDD-G08 Debugger — Enemy tab (formation/morale/affinity) + Squad tab
 *   SDD-G03 RunScene — DebuggerSquadBind wiring
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : 2026-08-24  squad follow-on documented against live code
 * Programming  : 2026-08-24  EnemyGroup + EnemySquadManager + SquadConfig
 * Game Design  : 2026-08-24  standoff 10, maxFury 4, patrol/egress split
 * TDD          : 2026-08-24  group / squad / enemy / balancer tests green
 *
 * Status: done (live in poc2; this spec is the config contract)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Files (one public class per kebab-case file):
 *   systems/formation-slots.ts      — hollowCircle | vWing | hollowDiamond
 *   systems/steering.ts             — scalar Reynolds (seek/arrive/flee/separation/…)
 *   systems/squad-config.ts         — SquadConfig + DEFAULT_SQUAD_CONFIG
 *   systems/enemy-group.ts          — EnemyGroup
 *   systems/enemy-squad-manager.ts  — EnemySquadManager
 *   gameobjects/enemy/enemy.ts      — micro AI + group-id sprite
 *   gameobjects/enemy/warrior.ts    — formation / morale / affinity sheet
 *
 * Cadence: group.integrate(dt) every frame; group.tick(dtMs) at tickHz (5 Hz).
 * Zero per-frame allocation: preallocated groups, slot buffers, SteerAcc scratch.
 */

export type FormationId = 'hollowCircle' | 'vWing' | 'hollowDiamond'
export type GroupObjective = 'patrol' | 'intercept' | 'egress'
export type ShipAiState = 'birth' | 'formation' | 'boost' | 'migrating' | 'fury' | 'flee'

export interface SquadConfig {
  readonly maxGroups: number
  readonly maxPerGroup: number
  readonly tickHz: number
  readonly shipsPerTick: number
  readonly maxFury: number
  readonly circleRadius: number
  readonly vSpacing: number
  readonly vAngleDeg: number
  readonly diamondW: number
  readonly diamondH: number
  readonly slotLerpRate: number
  readonly groupMaxSpeed: number
  readonly groupMaxForce: number
  readonly groupArriveRadius: number
  readonly groupTurnLambda: number
  readonly groupSeparationRadius: number
  readonly groupSeparationWeight: number
  readonly targetHoldMinMs: number
  readonly targetHoldMaxMs: number
  readonly casualtyPct: number
  readonly patrolZMin: number
  readonly patrolZMax: number
  readonly patrolStandoffZ: number
  readonly patrolAdvanceMin: number
  readonly patrolAdvanceMax: number
  readonly egressZMin: number
  readonly egressZMax: number
  readonly turnaroundChance: number
  readonly interceptStandoffZ: number
  readonly arenaHalfX: number
  readonly containmentInsetX: number
  readonly containmentExp: number
  readonly containmentWeight: number
  readonly curvatureScale: number
  readonly joinRadius: number
  readonly shipSeparationRadius: number
  readonly shipSeparationWeight: number
  readonly rogueAvoidRadius: number
  readonly rogueAvoidWeight: number
  readonly fleeBackZ: number
  readonly fleeEdgePaddingX: number
}

export declare class EnemyGroup {
  readonly id: number
  active: boolean
  x: number
  z: number
  objective: GroupObjective
  formation: FormationId
  spawnAt(x: number, z: number, ctx: unknown): void
  reserveSlot(member: unknown): number
  releaseSlot(member: unknown): void
  tick(dtMs: number, ctx: unknown): void
  integrate(dt: number, ctx: unknown, groups: readonly EnemyGroup[]): void
}

export declare class EnemySquadManager {
  liveConfig(): SquadConfig
  resetLiveConfig(): void
  register(ship: unknown): boolean
  unregister(ship: unknown): void
  detachFromGroup(ship: unknown): void
  update(dt: number, playerX: number, playerZ: number, minX: number, maxX: number): void
  furyCount(): number
  canEnterFury(): boolean
  rogueCount(): number
  activeGroupCount(): number
}

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   EnemyGroup.objective
 *     patrol    — close on +Z until standoff, then sweep X; never aim closer
 *                 than playerZ − patrolStandoffZ
 *     intercept — >casualtyPct member loss; still clamped to the same standoff
 *     egress    — centroid z ≥ playerZ; seek +Z to the BattleField near wall
 *
 *   EnemySquadManager.canEnterFury — furyCount() < maxFury (live, same frame)
 *   Enemy._enterRogue('fury')      — no-op when the cap is full; retries later
 *   Enemy._steerFlee               — locked ±X edge + −Z (diagonal peel, not +Z)
 *   Enemy group label sprite       — "0"…"5" group id, "F" fury, "L" flee, "-" birth
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. Birth (reachGate) eases rush → cruise and hands off without stopping;
 *       squad register happens at the gate.
 *   R2. At most maxGroups (6) active groups; at most maxPerGroup (8) ships each.
 *   R3. Formation templates never place a slot on the group centroid.
 *   R4. Patrol never aims closer than playerZ − patrolStandoffZ (default 10).
 *   R5. Crossing the player Z line commits the group to egress (no turnaround).
 *   R6. At most maxFury (4) ships may be in FURY at once.
 *   R7. FURY seeks the player's X and a Z always past them; never parks on playerZ.
 *   R8. Structural decisions run at tickHz, not every render frame.
 *   R9. Per-frame allocation: none in integrate / ship steering hot path.
 *   R10. BattleField.contains false ⇒ EnemyManager pool.release (despawn).
 *   R12. FLEE seeks a locked X-edge and a point behind the ship (−Z). It never
 *        continues the inbound +Z run.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      Enemy Mesh (rose wireframe box) + Sprite group-id label above
 *              (CanvasTexture, white fill, black stroke). Range circle optional
 *              (status.rangeVisible, default false).
 * Inheritance: Enemy extends THREE.Mesh; groups have no mesh.
 * syncRender writes: position, rotation.y, opacity, rangeMesh.visible, groupLabel
 * Never writes: group centroid, affinities, BALANCE
 * Scene ownership: EnemyManager pool (D14)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * Source: poc2/src/systems/squad-config.ts → DEFAULT_SQUAD_CONFIG
 *         BALANCE.enemy.squad = DEFAULT_SQUAD_CONFIG
 *
 * Caps / budget
 *   maxGroups          = 6     // simultaneous formations
 *   maxPerGroup        = 8     // slots + formation buffer
 *   tickHz             = 5     // structural AI (200 ms)
 *   shipsPerTick       = 12    // affinity/migration slice per tick
 *   maxFury            = 4     // concurrent kamikaze peel-offs
 *
 * Formation geometry (center always empty)
 *   circleRadius       = 7
 *   vSpacing           = 4
 *   vAngleDeg          = 35
 *   diamondW           = 8
 *   diamondH           = 6
 *   slotLerpRate       = 4     // damp λ when slots re-index (no snap)
 *
 * Group motion
 *   groupMaxSpeed      = 7
 *   groupMaxForce      = 12
 *   groupArriveRadius  = 8
 *   groupTurnLambda    = 2.5
 *   groupSeparationRadius = 26
 *   groupSeparationWeight = 8
 *
 * Objectives
 *   targetHoldMinMs    = 3000  // patrol waypoint hold window
 *   targetHoldMaxMs    = 5000
 *   casualtyPct        = 0.5   // peak loss → intercept
 *   patrolZMin         = -55   // legacy far band (approach still uses advance)
 *   patrolZMax         = -10   // mirrors standoff sign
 *   patrolStandoffZ    = 10    // closest Z gap in front of the player
 *   patrolAdvanceMin   = 8     // +Z step toward the standoff
 *   patrolAdvanceMax   = 18
 *   interceptStandoffZ = 16    // extra +Z push while still clamped to standoff
 *   egressZMin         = 28    // FURY / group egress aim past the player
 *   egressZMax         = 72
 *   turnaroundChance   = 0.22  // reserved; live FURY always continues +Z
 *
 * Arena / traffic
 *   arenaHalfX         = 34
 *   containmentInsetX  = 8
 *   containmentExp     = 3
 *   containmentWeight  = 12
 *   curvatureScale     = 0.6
 *   joinRadius         = 60
 *   shipSeparationRadius = 2.6
 *   shipSeparationWeight = 6
 *   rogueAvoidRadius   = 6
 *   rogueAvoidWeight   = 10
 *   fleeBackZ          = 28    // FLEE diagonal: this far toward spawn (−Z)
 *   fleeEdgePaddingX   = 18    // past the arena wall so they leave
 *
 * Population (balancer.ts enemy spawn)
 *   spawnLeft/Right/Front.maxActive = 8   // 24 live
 *   poolSize                        = 48
 *
 * Warrior sheet — per-ship (debugger Enemy tab; warrior.ts)
 *   formation.slotTolerance     = 1.2
 *   formation.boostDistance     = 9
 *   formation.boostAgilityMul   = 2.2
 *   formation.hoverAmp          = 0.35
 *   formation.hoverHz           = 0.5
 *   formation.imperfectionRadius = 0.3
 *   morale.furyProximityRadius  = 14
 *   morale.furyProximitySec     = 2
 *   morale.furyAgilityMul       = 2
 *   morale.retaliationHits      = 3
 *   morale.retaliationWindowMs  = 1200
 *   morale.fleeGroupHealthPct   = 15
 *   morale.fleeAgilityMul       = 1.6
 *   affinity.gainPerSec         = 0.6
 *   affinity.decayPerSec        = 0.25
 *   affinity.radius             = 18
 *   affinity.loyalty            = 0.15
 *
 * Feel:      Groups approach, hold the 10-unit line, and sweep. Pressure comes
 *            from up to four FURY dives, not from the whole squad stacking on
 *            the nose. Past the player they leave and die on the blue wall.
 * Leveling:  F03 spawn rate, not these knobs. maxFury / standoff are the live
 *            difficulty levers on the Squad tab.
 * Graphics:  White group-id billboard over each craft. F = fury, L = flee.
 * Pillars:   4 legibility (who belongs together) · 5 one-more-kill pressure.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * describe('formation-slots') — center empty for N=1..8; V mirrored; diamond outline
 * describe('steering')        — truncate, exponential containment
 * describe('EnemyGroup')
 *   it('never aims a patrol closer than the Z standoff')
 *   it('egresses after crossing the player Z line')
 *   it('switches to intercept after losing more than half the members')
 * describe('EnemySquadManager')
 *   it('never activates more than maxGroups')
 *   it('runs structural decisions on the staggered tick')
 *   it('caps concurrent FURY ships at maxFury')
 * describe('Enemy')
 *   it('registers in a group after birth / gate')
 *   it('refuses a fifth FURY while four are already raging')
 *   it('FURY keeps advancing past the player')
 *   it('FLEE peels to the side and back (−Z) instead of continuing +Z')
 * describe('SquadTab')
 *   it('edits squad tuning live and resets to defaults')
 *   it('exposes patrolStandoffZ / maxFury on the live config bind')
 *
 * Manual:
 *   A-manual-1. [manual] group numbers 0–5 match nearby formation mates
 *   A-manual-2. [manual] at most four "F" labels at once
 *   A-manual-3. [manual] patrol holds ~10 Z in front; overshoot flies to the wall
 *   A-manual-4. [manual] "L" ships cut to a screen corner, not straight +Z
 *
 * Coverage: R1–R12 + ENM-01/02 + RUL-12/13.
 */
