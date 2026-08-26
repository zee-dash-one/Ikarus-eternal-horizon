/**
 * #tag/arch #tag/enemies #tag/memory
 *
 * Card:         SDD-E01 Enemy
 * Hub:          .docs/plans/planning.spec.MD §5 (card) · §6.1 (DoD) · §6.3 (agents)
 * Requirements: ENM-01, ENM-02
 * Change type:  new
 * POC-1 origin: poc/src/gameobjects/testTarget.ts  — retire on landing (frozen; do not edit)
 * Test file:    poc2/src/gameobjects/enemy/enemy.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      The generic enemy game object — one public class `Enemy extends THREE.Mesh`.
 *            Pooled. Two lives: `birth` (reachGate lerp to EnemyGate) then squad
 *            life (slot seek, BOOST, FURY/FLEE). Implements TargetHit (team 'enemy').
 * Does not own: spawn schedule / live list (E05), group centroids (EnemySquadManager),
 *            collision matrix (F01). Archetypes Tank/Rogue remain hub §7.
 * Player-facing: rose filled gunships (plus a blue wireframe hitbox cube) that form up after the gate, hold a
 *            Z standoff, and peel off as capped kamikazes. Group-id label above each.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Must match the card. A mismatch is a documentation bug.
 *
 * Upstream (must exist before this starts):
 *   SDD-A01 Balancer — BALANCE.enemy.* numbers
 *   SDD-A03 Math     — scratch vectors, distXZ, clamp
 *   SDD-A05 ObjectPool<T> — acquire/release; Enemy is never `new`ed in update
 *   SDD-F01 CollisionManager — TargetHit / ColliderPort / Layer.Enemy seam
 *
 * Type seam with F01: Enemy implements TargetHit + ColliderPort. The cycle
 * E01 ⇄ F01 is types first, then both classes.
 *
 * Downstream (who breaks if this contract changes):
 *   SDD-E03 EnemyShot   — muzzle / team of the shooter
 *   SDD-E05 EnemyManager — pooling, EnemySquadManager, spawn/despawn
 *   SDD-F01 CollisionManager — Layer.Enemy colliders
 *   SDD-F04 DamageResolver — DamageSink.applyDamage
 *   SDD-F02 DropManager    — killed source for drop tables
 *   SDD-F05 VfxManager     — killed burst
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : hub-v4.3 / 2026-08-20  thin seek (no Yuka yet); TargetHit ready for F01
 * Programming  : hub-v4.4 / 2026-08-20  EnemyMovementManager (synchronizedLerp → seekChase)
 * Game Design  : hub-v4.4 / 2026-08-20  Warrior sheet + gate y=0 play-plane handoff
 * TDD          : hub-v4.4 / 2026-08-20  enemy + enemy-movement-manager tests
 * Programming  : 2026-08-24  squad life (formation/FURY/FLEE) + group-id sprite
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: done (Warrior + squad AI — see enemy-squad.spec.ts)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Public surface. Ports first, then the class. Constructor dependencies explicit.
 * No service locators. No globals besides BALANCE.
 * `extends THREE.Mesh` — the enemy *is* its visual (hub §4).
 * Lib: Three.js (Mesh). Post-gate motion is first-party Reynolds steering
 *      (systems/steering.ts) — Yuka SeekBehavior remains deferred.
 */

export type TeamId = 'player' | 'enemy'

/** Spatial / identity port consumed by F01 and D02/D05/D06 hit queries. */
export interface TargetHit {
  readonly team: TeamId
  active: boolean
  x: number
  z: number
  radius: number
  takeDamage(amount: number): void
}

/** F04 is the only combat caller. Enemy forwards TargetHit.takeDamage here. */
export interface DamageSink {
  applyDamage(amount: number, source: number): DamageOutcome
}

export interface DamageOutcome {
  readonly absorbedByShield: number
  readonly dealtToHull: number
  readonly shieldBroke: boolean
  readonly hullLevelChanged: boolean
  readonly destroyed: boolean
  readonly killed: boolean
}

export interface EnemySpawn {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly hp?: number
  readonly radius?: number
  readonly maxSpeed?: number
}

export interface SeekTargetPort {
  readonly x: number
  readonly z: number
}

export interface EnemyOptions {
  readonly geometry: unknown
  readonly material: unknown
  readonly seekTarget: SeekTargetPort
}

export declare class Enemy extends THREE.Mesh implements TargetHit, DamageSink {
  constructor(options: EnemyOptions)

  readonly team: 'enemy'
  readonly layer: 2
  active: boolean
  hp: number
  hpMax: number
  x: number
  y: number
  z: number
  radius: number
  readonly contactDamage: number
  /** First-party vehicle; position + maxSpeed. Not a THREE object. */
  readonly vehicle: {
    position: { x: number; y: number; z: number }
    maxSpeed: number
    update(dt: number): void
  }

  activate(spawn: EnemySpawn): void
  deactivate(): void
  /** Logic: birth then squad AI, hp, off-field flag. No GPU. */
  update(dt: number): void
  /** Writes position / rotation / opacity / visible only. */
  syncRender(): void
  /** TargetHit — forwards to applyDamage(amount, Layer.EnemyShot|PlayerShot). */
  takeDamage(amount: number): void
  applyDamage(amount: number, source: number): DamageOutcome
  /** True when |x| or z is outside BALANCE.enemy.despawn. E05 releases. */
  isOffField(): boolean
  /** Pool teardown only — not called on release. Frees this slot's material. */
  dispose(): void
}

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   field          | type     | meaning / unit / range
 *   ---------------|----------|-----------------------
 *   team           | 'enemy'  | TargetHit; never 'player'
 *   layer          | Layer.Enemy (2) | F01 matrix key
 *   active         | boolean  | pooled-live; false ⇒ ignored by F01
 *   hp / hpMax     | number   | BALANCE.enemy.generic.hp; 0 ⇒ killed
 *   x, z           | world    | play axes (hub D01 X/Y ≡ Three XZ; Y = height)
 *   radius         | world    | hit + visual half-extent
 *   contactDamage  | number   | F04 reads this on Enemy→Player
 *   vehicle        | first-party | position + maxSpeed; squad / birth write it
 *
 *   activate   — pre: inactive slot. post: hp=hpMax, active, vehicle at spawn, visible.
 *   deactivate — pre: any. post: active=false, visible=false, hp=0; GPU kept.
 *   takeDamage — F04 path; never called from F01. killed when hp<=0.
 *   isOffField — despawn predicate for E05; this class does not release itself.
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. Enemy extends THREE.Mesh (the mesh *is* the enemy).
 *   R2. Implements TargetHit with team === 'enemy' and radius from BALANCE.
 *   R3. takeDamage / applyDamage reduce hp; hp<=0 ⇒ active=false, killed=true, once.
 *   R4. Movement is two-phase:
 *       birth → spawn→EnemyGate at rush speed, easing down to cruise (never 0).
 *       Gate handoff keeps cruise velocity and switches to formation seek.
 *       squad → slot arrive (formation), BOOST to rejoin, FURY kamikaze (capped
 *       at BALANCE.enemy.squad.maxFury), FLEE diagonally to the X edge and
 *       back toward spawn (−Z). Group centroid
 *       motion is EnemyGroup (patrol standoff / intercept / egress).
 *   R4b. syncRender shows a billboard group id ("0"–"5", "F", "L", or "-").
 *   R5. update(dt) never allocates and never writes material/geometry; syncRender
 *       writes position (from vehicle), rotation.y, opacity only.
 *   R6. Memory: pooled. activate/deactivate recycle the slot. dispose() only on
 *       pool teardown. Shared BoxGeometry created once by E05; per-slot material.
 *   R7. Per-frame allocation: none (scratch scalars / reused Vector3 for the label).
 *   R8. isOffField() is true outside BALANCE.enemy.despawn; Enemy does not release.
 *   R9. contactDamage is read-only from BALANCE; Enemy never damages the ship itself.
 *   R10. Archetype is generic only — no Tank/Warrior/Rogue branch in this class (§7).
 *   R11. Retires poc/src/gameobjects/testTarget.ts as the hit dummy; TargetHit lives here.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      THREE.Mesh · shared 1×1×1 BoxGeometry scaled to 2×radius (blue wireframe hitbox)
 *              · child gunship (fuselage/wings/nose/tail) MeshBasicMaterial filled warrior.color
 * Inheritance: extends THREE.Mesh
 * syncRender writes: position (x,y,z), rotation.y (facing seek), material.opacity (hp/hpMax), visible
 * Never writes: hp, vehicle.position, active, BALANCE
 * Scene ownership: added/removed by EnemyManager / ObjectPool (D14 — managers own populations)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * New section (declare on SDD-A01). Starting values — tune at first playtest, not before.
 *
 *   BALANCE.enemy.generic.hp             = 8      // L1 laser dmg 1.5 ⇒ ~6 bolts / ~0.6s at rate 10
 *   BALANCE.enemy.generic.radius         = 0.7    // larger than ship half-width; readable box
 *   BALANCE.enemy.generic.speed          = 4      // < ship maxSpeed 12 — kiteable
 *   BALANCE.enemy.generic.contactDamage  = 15     // 50 shield ⇒ ~4 contacts to break Force Field
 *   BALANCE.enemy.generic.color          = 0xf43f5e // neon rose — MUST ≠ ship cyan 0x22d3ee
 *   BALANCE.enemy.generic.y              = 0      // play-plane height
 *   BALANCE.enemy.spawn.zFar             = -20    // deep field (ahead)
 *   BALANCE.enemy.spawn.halfX            = 7      // slightly wider than follow.halfX 6
 *   BALANCE.enemy.despawn.zNear          = 12     // past the ship / camera
 *   BALANCE.enemy.despawn.halfX          = 14     // off the sides
 *   BALANCE.enemy.poolSize               = 48     // E05; 24 live (8 per SpawnArea) + slack
 *   BALANCE.enemy.squad                  = DEFAULT_SQUAD_CONFIG  // enemy-squad.spec.ts
 *
 * Warrior sheet squad knobs (debugger Enemy tab; warrior.ts):
 *   formation.slotTolerance     = 1.2   // in-slot hover radius
 *   formation.boostDistance     = 9     // beyond this → BOOST rejoin
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
 * Feel:      Closes in as a formation, not a turret. Pressure is the 10-unit
 *            standoff plus capped FURY peels, not a wall stacked on the nose.
 *            TTK is one committed volley at L1.
 * Leveling:  E05 scales spawn rate via F03, not this class's hp. Archetypes Tank
 *            / Rogue remain hub §7 — G0 uses the Warrior sheet.
 * Graphics:  Filled rose gunship inside a blue wireframe hitbox cube. White group-id billboard
 *            ("0"–"5", "F", "L", "-"). Opacity tracks hp (readable damage, pillar 2).
 * Pillars:   4 legibility · 5 one-more-kill pressure · 1 visible risk (it is coming).
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * Protocol: write enemy.test.ts FIRST. `npm run test` must FAIL for the named cases.
 * File: poc2/src/gameobjects/enemy/enemy.test.ts
 * Runner: vitest (`npm run test` in poc2/)
 * Mocks: BALANCE.enemy slice, THREE.Mesh/BoxGeometry/MeshBasicMaterial stub,
 *        EnemySquadManager stub, SeekTargetPort {x:0,z:0}
 *
 * describe('Warrior sheet')
 *   it('carries squad knobs: formation, morale and affinity')                         // R4
 *
 * describe('Enemy Warrior — birth')
 *   it('activate loads the Warrior sheet and starts the birth animation')             // R4
 *   it('birth aims at gate centre + personal entry offset X')                         // R4
 *   it('speed eases from rush down to cruise along the birth path')                   // R4
 *   it('clears the gate at cruise speed and joins formation without stopping')        // R4
 *
 * describe('Enemy Warrior — squad life')
 *   it('registers with a group once the gate is cleared')                             // R4
 *   it('flies toward its reserved slot and settles into formation')                   // R4
 *   it('BOOSTs after being knocked far away from its slot')                           // R4
 *   it('goes FURY after sustained player proximity and leaves the formation')         // R4
 *   it('refuses a fifth FURY while four are already raging')                          // R4, maxFury
 *   it('FURY keeps advancing past the player instead of parking on their Z line')     // R4
 *   it('FLEEs the moment its shield breaks (diagonal: +|X| and −Z)')                  // R4
 *
 * describe('Enemy')
 *   it('extends THREE.Mesh')                                                          // R1
 *   it('implements TargetHit with team enemy and BALANCE radius')                     // R2, ENM-01
 *   it('applyDamage reduces hp and sets killed+inactive once at hp 0')                // R3
 *   it('syncRender writes mesh.position from vehicle and does not mutate hp')         // R5
 *   it('activate then deactivate recycles the slot without dispose')                  // R6, ENM-02
 *   it('update allocates no objects (Object.keys / no `new` in hot path spy)')        // R7
 *   it('isOffField is true past despawn.zNear / despawn.halfX')                       // R8, ENM-01
 *   it('exposes contactDamage from BALANCE and never calls into ShipHealth')          // R9
 *   it('draws a solid gunship body and a blue wireframe cube as the hitbox')          // visual
 *
 * Manual:
 *   A-manual-1. [manual] neon rose reads as hostile vs ship cyan in <0.3s
 *   A-manual-2. [manual] group-id labels match nearby formation mates
 *   A-manual-3. [manual] poc/src/gameobjects/testTarget.ts is not imported by poc2
 *
 * Coverage: R1–R11 + ENM-01 + ENM-02 + card Acceptance.
 */
