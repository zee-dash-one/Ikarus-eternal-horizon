/**
 * #tag/arch #tag/weapons #tag/memory
 *
 * Card:         SDD-D04 PlasmaBehaviour
 * Hub:          .docs/plans/planning.spec.MD §5 (card) · §6.1 (DoD) · §6.3 (agents)
 * Requirements: WPN-03, WPN-04, WPN-05
 * Change type:  class-ify
 * POC-1 origin: poc/src/weapons/behaviours/plasma.ts  — frozen reference
 * Test file:    poc2/src/gameobjects/weapon/behaviours/plasma.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      class PlasmaBehaviour implements WeaponBehaviour — slow pooled
 *            orbs. Spawns D01 WeaponShot via E04 ShotAcquirePort. Volley size
 *            is orb.explosionFoci (1 / 3 / 5 by four-level band). Registers
 *            into the D02 seam. Does not invent a second projectile type.
 *            F01 expands HitPairs inside aoeRadius on impact; PlasmaBurst is
 *            the growing orange-yellow sphere (area / duration from the row).
 * Does not own: Weapon device / catalog shape (D02), EnergyManager (D03), shot
 *            pool (E04), CollisionManager (F01), DamageResolver (F04).
 * Player-facing: fat orange orbs, slow and expensive, that keep 100% damage
 *            to the end of flight and detonate on hit. F / LB switches
 *            laser ↔ plasma (WPN-03).
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Must match the card. A mismatch is a documentation bug.
 *
 * Upstream (must exist before this starts):
 *   SDD-D01 WeaponShot     — activate with aoeRadius > 0, aoeDuration, spawn.color
 *   SDD-D02 Weapon + Laser — WeaponBehaviour, catalog.plasma, registerWeapon
 *   SDD-D03 EnergyManager  — EnergyPort
 *   SDD-E04 ShotManager    — ShotAcquirePort (shared WeaponShot pool)
 *
 * Downstream (who breaks if this contract changes):
 *   SDD-E07 FiringManager — loadout includes 'plasma'; cycleWeapon
 *   SDD-F01 CollisionManager — splash pairs via queryRadius on PlayerShot aoe
 *   SDD-F04 DamageResolver — consumes each HitPair (direct + splash)
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : hub-v4.3 / 2026-08-26  foci volley; F01 splash; burst VFX
 * Programming  : hub-v4.3 / 2026-08-26  D01 ShotSpawn aoeDuration; no lifetime decay
 * Game Design  : hub-v4.3 / 2026-08-26  explicit PLASMA_LEVELS L1–12 (laser pattern)
 * TDD          : hub-v4.3 / 2026-08-26  plasma-levels / plasma / burst / F01 splash
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: spec-complete
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Orb visual is D01 WeaponShot (aoeRadius > 0). PlasmaBehaviour is not THREE.
 * Impact sphere is PlasmaBurst (pooled Mesh, SphereGeometry). Types owned by
 * SDD-D02 are repeated so this spec is self-contained.
 */

export interface WeaponBehaviour {
  update(ctx: BehaviourCtx): void
  dispose(): void
}

export interface Vec3Like {
  x: number
  y: number
  z: number
}

export interface EnergyPort {
  canAfford(cost: number): boolean
  spend(cost: number): void
}

export interface WeaponModifiers {
  damageMul: number
  rateMul: number
  energyMul: number
  aoeMul: number
}

export interface BehaviourCtx {
  dt: number
  holding: boolean
  muzzle: Vec3Like
  services: { energy: EnergyPort }
  mods: WeaponModifiers
}

export interface OrbSpec {
  readonly speed: number
  readonly radius: number
  readonly lifetime: number
  readonly aoeRadius: number
  readonly aoeDuration: number
  readonly explosionFoci: number
  readonly forwardSpread: number
  readonly damageDecayPerUnit: number
}

export interface WeaponConfig {
  readonly id: 'plasma'
  readonly color: number
  readonly rate: number
  readonly energyPerShot: number
  readonly damage: number
  readonly poolSize: number
  readonly orb?: OrbSpec
}

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
  readonly aoeDuration?: number
  readonly range: number
  readonly decayPerUnit: number
  readonly color?: number
}

export interface ShotAcquirePort {
  acquire(): { activate(spawn: ShotSpawn): void } | null
  release(shot: { activate(spawn: ShotSpawn): void }): void
}

export declare class PlasmaBehaviour implements WeaponBehaviour {
  constructor(config: WeaponConfig, shots: ShotAcquirePort)

  update(ctx: BehaviourCtx): void
  dispose(): void
}

export declare function registerPlasma(): void

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   field      | type    | meaning
 *   -----------|---------|------------------------------------------------
 *   cooldown   | s       | 1 / (rate * rateMul) after a successful volley
 *   config.orb | OrbSpec | required; constructor throws if missing
 *
 * Non-obvious:
 *   update: cooldown -= dt; if !holding or cooldown>0 return.
 *   needed = round(explosionFoci) in 1..8. All-or-nothing acquire (laser
 *   volley rule): if the pool cannot cover every focus, release held shots,
 *   do not spend, do not set cooldown.
 *   cost = energyPerShot * energyMul once per volley; if !canAfford return.
 *   Each focus: x = muzzle.x + spread offset; z = muzzle.z; vx = 0;
 *   vz = -orb.speed; damage = config.damage * damageMul;
 *   lifetime = totalLifetime = orb.lifetime; radius = orb.radius;
 *   aoeRadius = orb.aoeRadius * aoeMul; aoeDuration = orb.aoeDuration;
 *   decayPerUnit = 0; range = speed * lifetime; color = 0xfb923c.
 *   THIS CLASS DOES NOT call takeDamage and does not iterate targets.
 *   On consume (impact) the orb deals its own damage, then a PlasmaBurst
 *   grows for aoeDuration. Explosion damage equals the orb's damage and
 *   uses A03 decayFactor(age/duration): 100 / 75 / 50 / 25 each quarter.
 *   Each hostile is hit once, the first time they enter the current radius.
 *   Path-end expiry spawns the same burst (no orb-hit damage if nothing was
 *   touched). E04 releases the orb; F04 resolves blast pairs.
 *   dispose: no GPU of its own (shots belong to E04; bursts to vfxManager).
 *   registerPlasma() calls registerWeapon('plasma', factory) once.
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. PlasmaBehaviour implements WeaponBehaviour.
 *   R2. The orb is a pooled WeaponShot, not a new projectile type.
 *   R3. Spawn writes aoeRadius from catalog * aoeMul (L1 default 2.4).
 *   R4. Energy gate: no spawn when !canAfford(4 * energyMul) at L1.
 *   R5. Cadence: cooldown = 1 / (2 * rateMul) after a successful volley.
 *   R6. vz = -speed (12); vx = 0. No homing. Play plane y = 0 (D01).
 *   R7. AoE damage is NOT applied here. No takeDamage, no target loop.
 *       Direct hit is F01+F04 (orb). Explosion is PlasmaBurst.pulse (F04).
 *       Path-end expiry spawns the same burst. Never per-frame while flying.
 *   R8. registerWeapon('plasma', factory) + catalog row — Weapon class
 *       unchanged (D12).
 *   R9. Per-frame allocation: none. dispose() is a no-op for GPU.
 *   R10. poolSize 64 is a catalog hint. E04 sizes the shared WeaponShot pool
 *        to max(loadout poolSizes) = 768. Plasma does not construct a pool.
 *   R11. spawn.color is 0xfb923c so a bolt acquired after a laser shot
 *        recolours on activate.
 *   R12. damageDecayPerUnit is 0. WeaponShot keeps effectiveDamage and
 *        opacity at 1.0 for aoeRadius > 0 and decayPerUnit <= 0.
 *   R13. explosionFoci is 1 (L1–4), 3 (L5–8), 5 (L9–12). Energy is spent
 *        once per volley. Spread uses orb.forwardSpread.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      D01 WeaponShot mesh, colour 0xfb923c, radius 0.28
 *              (thickness 0.56). Additive brick like laser, fatter and slower.
 *              On consume: PlasmaBurst sphere 0xfbbf24 grows to aoeRadius and
 *              fades over aoeDuration.
 * Inheritance: N/A (behaviour). The shot extends THREE.Mesh.
 * syncRender writes: N/A here — WeaponShot / PlasmaBurst present the view
 * Never writes: hostile HP
 * Scene ownership: E04 (orbs). PlasmaBurstManager (bursts). This class never scene.add.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * Explicit table PLASMA_LEVELS in weapon-levels.ts (re-export plasma-levels.ts).
 * BALANCE.weapons.levels.plasma = PLASMA_LEVELS. Catalog L1 copies row 0.
 *
 * Shared across all 12 rows:
 *   speed 12 · radius 0.28 · lifetime 3 · rate 2 · damageDecayPerUnit 0
 *   forwardSpread 0.9
 *
 * Four-level bands:
 *   L1–4  damage 80  energy 4  aoeRadius 2.4  aoeDuration 0.4  foci 1
 *   L5–8  damage 100 energy 5  aoeRadius 2.8  aoeDuration 0.45 foci 3
 *   L9–12 damage 120 energy 6  aoeRadius 3.2  aoeDuration 0.5  foci 5
 *
 * WEAPONS.plasma identity:
 *   color 0xfb923c · profile 'orb' · poolSize 64 · muzzleOffset z -1.4
 *
 * BALANCE.vfx.plasmaBurst = { poolSize: 24, color: 0xfbbf24 }
 *
 * Feel vs laser L1 (dmg 40, rate 10, energy 0.5, speed 30): slower, costlier,
 * twice the hit, no fade with distance. Direct hit deals orb damage, then the
 * expanding blast deals the same amount on A03 rungs (100/75/50/25 of duration).
 * Hostiles that walk into the sphere later take the current rung once.
 * Equips tab edits aoeRadius / aoeDuration / explosionFoci / damage.
 * Pillars: 4 legibility; WPN-03 second weapon; WPN-05 cost.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * Files:
 *   poc2/src/gameobjects/weapon/behaviours/plasma.test.ts
 *   poc2/src/gameobjects/weapon/plasma-levels.test.ts
 *   poc2/src/gameobjects/weapon/plasma-burst.test.ts
 *   poc2/src/gameobjects/weapon/plasma-detonate.test.ts
 * Runner: vitest
 * Mocks: EnergyPort, ShotAcquirePort recording activate() payloads, WeaponConfig
 *        plasma slice, BehaviourCtx. Burst tests use a Scene.
 *
 * describe('PlasmaBehaviour')
 *   it('implements WeaponBehaviour')                                               // R1
 *   it('activates a WeaponShot from the acquire port (no other entity type)')      // R2
 *   it('writes aoeRadius 2.4 * aoeMul onto the spawn')                             // R3
 *   it('writes vz=-12, radius 0.28, lifetime 3, damage 80, color 0xfb923c')        // catalog, R11
 *   it('does not write a y field on ShotSpawn')                                    // R6, D01
 *   it('spends 4 energy and skips the shot when canAfford is false')               // R4, WPN-05
 *   it('sets cooldown to 1/2 after a successful spawn')                            // R5
 *   it('does not call takeDamage')                                                 // R7
 *   it('does not apply AoE while the orb is in flight')                            // R7
 *   it('L5 volley activates 3 orbs and spends energy once')                        // R13
 *   it('skips the volley when the pool cannot cover every focus')                  // R9
 *   it('update allocates no objects')                                              // R9
 *
 * describe('registerPlasma')
 *   it('registerWeapon("plasma", factory) lets Weapon construct without a switch') // R8, D12
 *
 * describe('PLASMA_LEVELS')
 *   it('has 12 rows, levels 1..12')
 *   it('damage / energy / aoe / duration / foci step every four levels')
 *
 * Manual:
 *   A-manual-1. [manual] an orb detonating damages every hostile inside aoeRadius
 *               (impact and end-of-path)
 *   A-manual-2. [manual] orange orb is distinct from the cyan laser at a glance
 *   A-manual-3. [manual] impact sphere grows and fades; L5 fires three orbs
 *   A-manual-4. [manual] a miss still explodes at the end of the flight
 *
 * Coverage: R1–R13 + card Acceptance.
 */
