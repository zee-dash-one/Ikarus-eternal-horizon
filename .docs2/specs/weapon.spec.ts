/**
 * #tag/arch #tag/weapons #tag/memory
 *
 * Card:         SDD-D02 Weapon device + Laser
 * Hub:          .docs/plans/planning.spec.MD §5 (card) · §6.1 (DoD) · §6.3 (agents)
 * Requirements: WPN-01, WPN-04, WPN-05, SHIP-03
 * Change type:  port + class-ify
 * POC-1 origin: poc/src/weapons/{weapon,behaviour,registry,laserLevels,behaviours/laser}.ts
 *               + poc/src/core/weaponsCatalog.ts  — frozen reference
 * Test file:    poc2/src/gameobjects/weapon/weapon.test.ts
 *               poc2/src/gameobjects/weapon/laser-levels.test.ts
 *               poc2/src/gameobjects/weapon/catalog.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      The weapon device, the behaviour port, catalog.ts (WEAPONS),
 *            the registry seam (D12), LaserBehaviour, and LASER_LEVELS.
 *            class Weapon looks up id → config + factory; it does not own
 *            the shot pool (E04 does). LaserBehaviour fills D01 ShotSpawn
 *            and acquire()s bolts.
 * Does not own: WeaponShot mesh (D01), EnergyManager (D03), ShotManager pool
 *            lifecycle (E04), FiringManager input (E07), Plasma behaviour
 *            (D04 registers into this seam). Beam/Mjolnir (D05/D06) register with
 *            BEAM_LEVELS / MJOLNIR_LEVELS, WeaponDeps.scene for visuals, and
 *            WeaponDeps.sound for SFX cues (playOverheatCue).
 * Player-facing: L1 cyan needle at 8/s cost 1; L5/L12 volley shapes when applyLaserLevel
 *            is used. Adding a weapon must not edit class Weapon.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Must match the card. A mismatch is a documentation bug.
 *
 * Upstream (must exist before this starts):
 *   SDD-A01 Balancer      — re-exports this catalog; energy / loadout live there
 *   SDD-A03 Math          — DEG2RAD for diagonal volleys
 *   SDD-A05 ObjectPool    — generic pool type (constructed by E04, not here)
 *   SDD-D01 WeaponShot    — activate(ShotSpawn)
 *   SDD-D03 EnergyManager — EnergyPort canAfford/spend
 *   SDD-E04 ShotManager   — ShotAcquirePort; Weapon never constructs a pool
 *
 * Downstream (who breaks if this contract changes):
 *   SDD-D04 Plasma        — 1 catalog row + 1 registerWeapon
 *   SDD-D05 / D06         — registerWeapon + weapon-levels L1–12
 *   SDD-E07 FiringManager — constructs Weapon(id, shots), feeds BehaviourCtx
 *   SDD-E01 Enemy         — hardpoints construct the same Weapon; EnemyShot pool
 *   §7 Equipment          — `{id}_lvl_n` stamps copy these tables; mods do not live here
 *   SDD-G08 Debugger      — LASER_LEVELS presets
 *
 * Cycle note: catalog.ts must not import BALANCE. balancer.ts imports WEAPONS
 * so RUL-12 stays one path: BALANCE.weapons.catalog === WEAPONS.
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : hub-v4.3 / 2026-08-18  E04 owns pool; catalog extract; D14 no Scene
 * Programming  : hub-v4.3 / 2026-08-18  ShotAcquirePort, ShotSpawn from D01, no scene.add
 * Game Design  : hub-v4.3 / 2026-08-19  LASER_LEVELS L1–L12 volley + energy table
 * TDD          : hub-v4.3 / 2026-08-18  weapon + laser + catalog tests green
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: done
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Public surface. Ports first, then the class. Constructor dependencies explicit.
 * No service locators. No Scene. Weapon is not a THREE object (D01 is).
 * D12: adding a weapon = 1 catalog.ts entry + 1 registerWeapon call.
 * D14: this card never scene.add. E04 adds pooled meshes on fill.
 */

export type WeaponId = 'laser' | 'plasma' | 'beam' | 'mjolnir'

export type WeaponProfile = 'projectile' | 'orb' | 'beam' | 'cone'

export interface Vec3Like {
  x: number
  y: number
  z: number
}

/** Port owned by SDD-D03. */
export interface EnergyPort {
  canAfford(cost: number): boolean
  spend(cost: number): void
}

export interface WeaponServices {
  energy: EnergyPort
}

export interface WeaponModifiers {
  damageMul: number
  rateMul: number
  energyMul: number
  aoeMul: number
  beamWidthMul: number
  coneMul: number
}

export interface BehaviourCtx {
  dt: number
  holding: boolean
  muzzle: Vec3Like
  services: WeaponServices
  mods: WeaponModifiers
}

export interface WeaponBehaviour {
  update(ctx: BehaviourCtx): void
  dispose(): void
}

/** E04 is the only acquire. Behaviours must not `new` a shot. */
export interface ShotAcquirePort {
  acquire(): { activate(spawn: ShotSpawn): void } | null
}

/** Port owned by §7 SoundManager. Missing sound is a silent no-op. */
export interface SoundPort {
  playOverheatCue(): void
}

export interface WeaponDeps {
  readonly scene?: unknown
  readonly sound?: SoundPort
}

/** Identical to D01. Copied so this spec is self-contained. */
export interface ShotSpawn {
  readonly x: number
  readonly z: number
  readonly vx: number
  readonly vz: number
  readonly damage: number
  readonly lifetime: number
  readonly totalLifetime: number
  readonly radius: number
  readonly aoeRadius: number
  readonly range: number
  readonly decayPerUnit: number
  readonly color?: number
}

export interface ProjectileSpec {
  readonly speed: number
  readonly radius: number
  readonly lifetime: number
  readonly damageDecayPerUnit: number
}

export interface OrbSpec {
  readonly speed: number
  readonly radius: number
  readonly lifetime: number
  readonly aoeRadius: number
  readonly damageDecayPerUnit: number
}

export interface BeamSpec {
  readonly width: number
  readonly length: number
  readonly ticksPerSec: number
  readonly dps: number
  readonly energyPerSec: number
}

export interface ConeSpec {
  readonly angleDeg: number
  readonly length: number
  readonly ticksPerSec: number
  readonly dps: number
  readonly energyPerSec: number
}

export interface LaserSpec {
  readonly forwardShots: number
  readonly diagonalShotsPerSide: number
  readonly totalShots: number
  readonly diagonalAngleDeg: number
  readonly forwardSpread: number
  readonly diagonalSpreadDeg: number
  readonly burstShots: number
  readonly overheatSec: number
}

export interface WeaponConfig {
  readonly id: WeaponId
  readonly displayName: string
  readonly color: number
  readonly rate: number
  readonly energyPerShot: number
  readonly damage: number
  readonly profile: WeaponProfile
  readonly poolSize: number
  readonly muzzleOffset: { readonly x: number; readonly y: number; readonly z: number }
  level?: number
  projectile?: ProjectileSpec
  orb?: OrbSpec
  beam?: BeamSpec
  cone?: ConeSpec
  laser?: LaserSpec
}

export type WeaponBehaviourFactory = (
  config: WeaponConfig,
  shots: ShotAcquirePort,
  deps?: WeaponDeps,
) => WeaponBehaviour

export declare const WEAPONS: Record<WeaponId, WeaponConfig>

export declare const WEAPON_REGISTRY: Partial<Record<WeaponId, WeaponBehaviourFactory>>

export declare function registerWeapon(id: WeaponId, factory: WeaponBehaviourFactory): void

export declare const LASER_LEVELS: readonly LaserLevel[]

export interface LaserLevel {
  readonly level: number
  readonly damage: number
  readonly rate: number
  readonly energyPerShot: number
  readonly speed: number
  readonly radius: number
  readonly lifetime: number
  readonly forwardShots: number
  readonly diagonalShotsPerSide: number
  readonly diagonalAngleDeg: number
  readonly forwardSpread: number
}

export declare function applyLaserLevel(cfg: WeaponConfig, level: number): void

export declare function defaultModifiers(): WeaponModifiers

export interface WeaponOptions {
  readonly id: WeaponId
  readonly shots: ShotAcquirePort
  readonly deps?: WeaponDeps
}

export declare class Weapon {
  /**
   * Looks up WEAPONS[id] + WEAPON_REGISTRY[id]. Builds the behaviour via the
   * factory. Does not construct, dispose, or scene.add a pool (E04).
   */
  constructor(options: WeaponOptions)

  readonly id: WeaponId
  readonly config: WeaponConfig

  update(ctx: BehaviourCtx): void
  dispose(): void
}

export declare class LaserBehaviour implements WeaponBehaviour {
  constructor(config: WeaponConfig, shots: ShotAcquirePort, sound?: SoundPort)

  /** Soft overheat SFX hook — forwards to SoundPort.playOverheatCue(). */
  playOverheatCue(): void
  update(ctx: BehaviourCtx): void
  dispose(): void
}

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   module              | role
 *   --------------------|------------------------------------------------
 *   catalog.ts          | WEAPONS data; imported by balancer.ts
 *   registry.ts         | WEAPON_REGISTRY + registerWeapon (D12 seam)
 *   laser-levels.ts     | LASER_LEVELS[1..12] + applyLaserLevel
 *   weapon.ts           | class Weapon — device: config + behaviour
 *   behaviours/laser.ts | class LaserBehaviour
 *
 * Weapon:
 *   constructor throws if WEAPON_REGISTRY[id] is missing (beam/mjolnir this
 *   pass). update forwards to behaviour.update(ctx). dispose() disposes the
 *   behaviour only — never the E04 pool.
 *
 * LaserBehaviour.update:
 *   If overheat timer > 0, tick it down and return (barrel cooling).
 *   Releasing fire (`!holding`) resets the burst count — a pause breaks the streak.
 *   Cadence follows `config.rate`: cooldown = 1 / (rate * rateMul) after each
 *   volley. After `laser.burstShots` uninterrupted volleys, set overheat to
 *   `laser.overheatSec` and call playOverheatCue() once (SoundManager).
 *   cost = energyPerShot * energyMul; return if !canAfford. Reserve every
 *   bolt in the fan first; if the pool is short, release and return without
 *   spending. Then spend and activate the reserved slots.
 *   Spawn forwardShots along X with forwardSpread; for each side ±1 spawn
 *   diagonalShotsPerSide at ±diagonalAngleDeg + jitter * diagonalSpreadDeg.
 *   vx,vz = (sin(rad)*speed, -cos(rad)*speed); forward uses vx=0, vz=-speed.
 *   ShotSpawn: aoeRadius 0; decayPerUnit from projectile; totalLifetime =
 *   lifetime; range = speed * lifetime; color = config.color.
 *   y is not a spawn field (D01 play plane y = 0).
 *   A fully exhausted pool does not spend energy and does not count the burst —
 *   reserved bolts are released and the fan is skipped as a whole.
 *
 * applyLaserLevel:
 *   copies the matching LASER_LEVELS row onto cfg damage/rate/energyPerShot
 *   and projectile.speed/radius/lifetime and laser.forward/diag/angle/spread.
 *   laser.totalShots = forwardShots + 2 * diagonalShotsPerSide (= level).
 *
 * Non-obvious: Weapon does not switch behaviours — E07 constructs a new
 * Weapon({ id, shots }). registerWeapon is the only DLC hook.
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. WeaponBehaviour is { update(ctx): void; dispose(): void }.
 *   R2. Weapon is a device: config + behaviour via registry. No switch on
 *       WeaponId. No Scene constructor arg.
 *   R3. Adding a weapon = 1 catalog.ts entry + 1 registerWeapon call.
 *       Class Weapon is not edited (D12).
 *   R4. Energy gate: no spawn when !canAfford(energyPerShot * energyMul).
 *   R5. Cadence: cooldown = 1 / (rate * rateMul) between volleys. First shot
 *       is allowed on the first holding frame. After laser.burstShots (15)
 *       uninterrupted volleys, wait laser.overheatSec (0.5) and call
 *       playOverheatCue() once (SoundManager). Releasing fire resets the streak.
 *   R6. totalShots = forwardShots + 2 * diagonalShotsPerSide = level
 *       for every LASER_LEVELS row.
 *   R7. L1 = 1 forward; L4 = 4 forward; L5 = 3 forward + 1/side; L10 = 4
 *       forward + 3/side; L12 = 4 forward + 4/side.
 *   R8. Laser bolts: speed 30, aoeRadius 0, radius 0.12. Lifetime is 2 / 2.5 / 3
 *       by four-level band. Catalog poolSize 768 is consumed by E04, not by this class.
 *   R9. Per-frame allocation: none. Shots come from E04. A volley is
 *       all-or-nothing: if acquire cannot cover every bolt, reserved slots
 *       are released and nothing fires (no lopsided fan).
 *   R10. dispose() disposes the behaviour. It does not dispose the pool.
 *   R11. applyLaserLevel is a no-op for an unknown level (does not throw).
 *   R12. catalog.ts does not import balancer (import cycle). L1 stats come from
 *       LASER_LEVELS[0] / PLASMA_LEVELS[0] / … in weapon-levels.ts.
 *   R13. This pass registers 'laser' (and D04 registers 'plasma'). 'beam'
 *       and 'mjolnir' stay in WEAPONS but WEAPON_REGISTRY has no factory.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      N/A on Weapon / LaserBehaviour — bolts are D01 WeaponShot
 * Inheritance: N/A (device + behaviour)
 * syncRender writes: N/A (E04 forwards shot.syncRender)
 * Scene ownership: E04 / G03. This card never scene.add.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * Catalog source of truth is BALANCE.weapons (A01). Tables are defined in
 * catalog.ts + weapon-levels.ts and re-exported:
 *   BALANCE.weapons.catalog === WEAPONS
 *   BALANCE.weapons.levels.laser === LASER_LEVELS
 *   BALANCE.weapons.loadout = ['laser', 'plasma', 'beam', 'mjolnir']
 * Laser L1 catalog stats are copied from LASER_LEVELS[0] (no second literal).
 * Enemy hardpoints consume these same tables (enemy-bestiary.spec.ts R14);
 * they do not get a parallel gun catalog. Weapon-mod equips (equipment.spec.ts)
 * add damage/rate/speed/radius after the stamp — they never edit this file.
 *
 * Laser catalog (L1 defaults; applyWeaponLevel overwrites per level):
 *   id / displayName / color     = 'laser' / 'Laser' / 0x22d3ee
 *   rate / energyPerShot / damage = 10 / 0.5 / 1.5
 *   profile / poolSize           = 'projectile' / 768
 *   muzzleOffset                 = { x: 0, y: 0, z: -1.4 }
 *   projectile.speed / lifetime / radius / damageDecayPerUnit = 30 / 2 / 0.12 / 0
 *   laser.forwardShots / diagonalShotsPerSide / totalShots    = 1 / 0 / 1
 *   laser.diagonalAngleDeg / forwardSpread / diagonalSpreadDeg = 15 / 0.55 / 10
 *   laser.burstShots / overheatSec                             = 15 / 0.5
 *
 * LASER_LEVELS — four-level bands (volley shape still fwd + 2*diag = level):
 *
 *   Band   L      dmg   rate  energy (L1 / rest)  life  volley
 *   A      1–4    1.5   10    0.5 then 0.25       2     1–4 forward, no diagonals
 *   B      5–8    2     11    0.5                 2.5   3+1, 4+1, 3+2, 4+2
 *   C      9–12   2.5   12    1                   3     3+3, 4+3, 3+4, 4+4
 *
 *   L  dmg  rate  energy  speed  radius  life  fwd  diag/side  angle  spread
 *   1  1.5  10    0.5     30     0.12    2     1    0          15     0.55
 *   2  1.5  10    0.25    30     0.12    2     2    0          15     0.55
 *   3  1.5  10    0.25    30     0.12    2     3    0          15     0.55
 *   4  1.5  10    0.25    30     0.12    2     4    0          15     0.55
 *   5  2    11    0.5     30     0.12    2.5   3    1          15     0.55
 *   6  2    11    0.5     30     0.12    2.5   4    1          15     0.55
 *   7  2    11    0.5     30     0.12    2.5   3    2          15     0.55
 *   8  2    11    0.5     30     0.12    2.5   4    2          15     0.55
 *   9  2.5  12    1       30     0.12    3     3    3          15     0.55
 *  10  2.5  12    1       30     0.12    3     4    3          15     0.55
 *  11  2.5  12    1       30     0.12    3     3    4          15     0.55
 *  12  2.5  12    1       30     0.12    3     4    4          15     0.55
 *
 * Invariant: fwd + 2*diag/side = level for every row. Speed 30 · radius 0.12
 * on every row. Lifetime and cadence step per band, not per level. Play starts
 * at L1 (catalog === band A). G08 Equips slider applies the row live.
 *
 * Plasma / Beam / Mjolnir rows: see D04 / D05 / D06. Nested orb/beam/cone
 * live in catalog.ts now so A01 is not a second table.
 *
 * Feel:      L1 is a single cyan needle at 10 Hz. Cost 0.5 vs regen 8 leaves
 *            headroom (~5/s drain). Higher bands add bolts and a tick of
 *            cadence; L2–4 spend less per volley so the extra needles are
 *            cheap. Thickness from D01 (2×radius).
 * Leveling:  this table IS the laser leveling. Hull fireRateMul (C03) scales
 *            cooldown on top via mods.rateMul.
 * Graphics:  cyan 0x22d3ee. Pillar 4.
 * Pillars:   fire-laser fragment; WPN-01 pooled fire; WPN-05 cost.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * Files:
 *   poc2/src/gameobjects/weapon/weapon.test.ts
 *   poc2/src/gameobjects/weapon/laser-levels.test.ts
 *   poc2/src/gameobjects/weapon/catalog.test.ts
 * Runner: vitest
 * Mocks: EnergyPort stub, ShotAcquirePort that records activate() calls.
 *        Real WEAPONS / LASER_LEVELS. No Scene. No ObjectPool.
 *
 * describe('WEAPONS catalog')
 *   it('has laser projectile 30/2/0.12 and plasma orb 12/3/0.28/2.4')           // RUL-12
 *   it('is the same object as BALANCE.weapons.catalog')                            // R12
 *   it('does not import balancer (source-text)')                                   // R12
 *
 * describe('Weapon')
 *   it('constructs from id by asking the registry, not a switch on WeaponId')     // R2, D12
 *   it('applyLevel writes the LASER_LEVELS row onto config')                       // G08 Equips
 *   it('throws when the registry has no factory for that id')                      // R13
 *   it('update forwards BehaviourCtx to the behaviour')                            // R1
 *   it('dispose disposes behaviour and does not dispose the acquire port')         // R10
 *   it('registerWeapon(id, factory) is the only hook a new weapon needs')          // R3
 *   it('constructor does not take a Scene')                                        // R2, D14
 *
 * describe('LaserBehaviour')
 *   it('spawns no shots when energy.canAfford is false')                           // R4, WPN-05
 *   it('spends energyPerShot * energyMul on a successful volley')                  // R4
 *   it('spaces volleys by 1 / (rate * rateMul); L1 rate 10 ⇒ 0.1s')                // R5
 *   it('overheats after 15 uninterrupted volleys and cools for overheatSec')       // R5
 *   it('playOverheatCue dispatches the laser-overheat sfx cue')                    // R5
 *   it('releasing fire resets the burst count so a pause never overheats')         // R5
 *   it('L1 spawns 1 forward bolt with vx=0, vz=-30, aoeRadius 0, color 0x22d3ee')  // R7, R8
 *   it('L5 spawns 5 bolts — 3 forward + 1 per side')                               // R7, Acceptance
 *   it('L10 spawns 10 bolts — 4 forward + 3 per side')                             // R7, Acceptance
 *   it('L12 spawns 12 bolts — 4 forward + 4 per side')                             // R7
 *   it('muzzle uses catalog muzzleOffset via ctx.muzzle (not a literal)')          // catalog
 *   it('aborts the whole volley when the pool cannot cover every bolt')            // R9
 *   it('update allocates no objects')                                              // R9
 *
 * describe('LASER_LEVELS')
 *   it('has 12 rows, levels 1..12')                                                // table
 *   it('every row satisfies forward + 2*diagPerSide === level')                    // R6
 *   it('every row has speed 30, radius 0.12, and lifetime by four-level band')     // R8
 *   it('damage and rate step 1.5/10 → 2/11 → 2.5/12 every four levels')            // table
 *   it('volley is front + equal diagonals per the L1–L12 table')                   // R7
 *   it('applyLaserLevel(cfg, 5) writes damage 2, rate 11, energy 0.5, radius 0.12')
 *   it('applyLaserLevel(cfg, 12) writes 4 forward + 4 per side and energy 1')
 *   it('applyLaserLevel(cfg, 99) is a no-op')                                      // R11
 *
 * Manual:
 *   A-manual-1. [manual] L5 fan is readable as 3-forward + 2-diagonal
 *   A-manual-2. [manual] holding fire at 0 energy produces silence, not a stall
 *
 * Coverage: R1–R13 + card Acceptance (L5=5, L12=12, new id needs no Weapon edit).
 */
