/**
 * #tag/arch #tag/enemies #tag/managers #tag/memory
 *
 * Card:         SDD-E05 EnemyManager
 * Hub:          .docs/plans/planning.spec.MD §5 (card) · §6.1 (DoD) · §6.3 (agents)
 * Requirements: ENM-01, ENM-02, RUL-02
 * Change type:  new
 * POC-1 origin: none (new)
 * Test file:    poc2/src/systems/enemy-manager.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      The enemy population — spawn schedule, live list, pooling, despawn,
 *            and the composed `EnemySquadManager` (groups, affinity, FURY cap).
 *            Registers / unregisters colliders with F01. Culls via BattleField.contains.
 * Does not own: Enemy class internals (E01), group steering math (EnemyGroup),
 *            difficulty math (F03), damage (F04).
 * Player-facing: a continuous stream from the three SpawnAreas that forms up
 *            after the EnemyGate and never snowballs off-screen (RUL-02).
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Must match the card. A mismatch is a documentation bug.
 *
 * Upstream (must exist before this starts):
 *   SDD-A01 Balancer — BALANCE.enemy.spawn / poolSize
 *   SDD-A03 Math     — scratch, random-in-range helper
 *   SDD-A05 ObjectPool<T>
 *   SDD-E01 Enemy    — pooled class + first-party vehicle
 *   SDD-F03 DifficultyManager — spawnRateMul, patternId, pendingMilestone
 *
 * Downstream (who breaks if this contract changes):
 *   SDD-F01 CollisionManager — registerTarget / unregisterTarget
 *   SDD-F02 DropManager      — killed enemies as drop sources
 *   SDD-G03 RunScene         — construct / update / dispose
 *   SDD-E03 EnemyShot        — future tryFire via E04 (stub ok)
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : hub-v4.3 / 2026-08-20  SpawnArea volume; maxActive=1 test stream
 * Programming  : hub-v4.3 / 2026-08-20  ObjectPool + intervalSec; no F01 register yet
 * Game Design  : hub-v4.3 / 2026-08-20  BALANCE.enemy.spawn.* live via debugger
 * TDD          : hub-v4.3 / 2026-08-20  enemy-manager.test.ts green
 * Programming  : 2026-08-24  owns EnemySquadManager; poolSize 48 / maxActive 8
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: done (squad composed; Yuka EntityManager still deferred)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Lib: Three.js (scene add/remove of Enemy meshes). Group AI is composed
 *      EnemySquadManager (first-party Reynolds). Yuka EntityManager deferred.
 */

export interface DifficultyPort {
  readonly spawnRateMul: number
  readonly patternId: string
  readonly pendingMilestone: 'miniBoss' | 'megaAsteroid' | 'boss' | null
}

export interface ColliderRegistryPort {
  registerTarget(t: unknown): void
  unregisterTarget(t: unknown): void
}

export interface SeekTargetPort {
  readonly x: number
  readonly z: number
}

export interface ObjectPoolPort<T> {
  readonly capacity: number
  acquire(): T | null
  release(item: T): void
  forEachActive(fn: (item: T) => void): void
  clear(): void
  dispose(): void
}

export interface EnemyLike {
  active: boolean
  hp: number
  vehicle: { update(dt: number): void }
  activate(spawn: unknown): void
  update(dt: number): void
  syncRender(): void
  isOffField(): boolean
  deactivate(): void
}

export interface EnemyManagerOptions {
  readonly pool: ObjectPoolPort<EnemyLike>
  readonly difficulty: DifficultyPort
  readonly colliders: ColliderRegistryPort
  readonly seekTarget: SeekTargetPort
  readonly scene: { add(obj: unknown): void; remove(obj: unknown): void }
}

export declare class EnemyManager {
  constructor(options: EnemyManagerOptions)

  readonly liveCount: number
  spawnOne(at?: { x: number; z: number }): EnemyLike | null
  update(dt: number): void
  syncRender(): void
  forEachLive(fn: (e: EnemyLike) => void): void
  clear(): void
  dispose(): void
}

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   field          | type     | meaning / unit / range
 *   ---------------|----------|-----------------------
 *   liveCount      | int      | active pooled enemies
 *   spawnAcc       | sec      | accumulator toward next spawn
 *   squad          | EnemySquadManager | groups, affinity, FURY cap
 *   patternId      | string   | copied from F03; G0 generic ignores, §7 branches
 *
 *   spawnOne — acquire; null on exhaustion (no `new`). activate in SpawnArea
 *              lanes + EnemyGate entry offset. scene.add, registerTarget.
 *   update   — spawnAcc per side; spawn while under that side's maxActive (8).
 *              squad.update(dt, player, BattleField world X) THEN enemy.update.
 *              forEachActive: if !active || !battleField.contains || hp<=0
 *              → squad.unregister + pool.release (reuse; no mesh destroy).
 *   squad()  — live EnemySquadManager for the Squad debugger tab.
 *   MiniBoss pendingMilestone: expose only; do not spawn a boss class (ENM-03/§7).
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. Spawns continuously on a timer scaled by F03.spawnRateMul (ENM-01).
 *   R2. Population is pooled; exhaustion returns null; liveCount ≤ pool.capacity (ENM-02).
 *   R3. Off-field or killed enemies are released the same frame (RUL-02).
 *   R4. Owns EnemySquadManager. After spawn, squad.update(dt, shipX, shipZ)
 *       then each live enemy.update(dt, shipX, shipZ). Squad does not duplicate
 *       birth lerp (that's EnemyMovementManager).
 *   R5. Register with F01 on spawn, unregister on release — no stale colliders.
 *   R6. Per-frame allocation: none (no live[] rebuild; pool.forEachActive).
 *   R7. Does not spawn Tank/Warrior/Rogue or MiniBoss; patternId is stored only.
 *   R8. Does not apply damage or spawn drops.
 *   R9. syncRender forwards to live enemies; manager has no mesh.
 *   R10. dispose: clear live, pool.dispose, entityManager.clear.
 *   R11. interval uses BALANCE.enemy.spawn.intervalSec / spawnRateMul; spawnRateMul
 *        < 0.01 is clamped so interval stays finite.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      N/A as a manager — Enemy meshes are the visual
 * Inheritance: N/A (orchestration)
 * syncRender writes: forwards Enemy.syncRender()
 * Never writes: spawnAcc, BALANCE, difficulty
 * Scene ownership: this manager adds/removes Enemy meshes (D14 populations)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * New keys (declare on SDD-A01), consumed here:
 *   BALANCE.enemy.spawnLeft/Right/Front.maxActive = 8
 *   BALANCE.enemy.spawn*.intervalSec = 1.2
 *   BALANCE.enemy.poolSize          = 48
 *   BALANCE.enemy.squad             = DEFAULT_SQUAD_CONFIG  // see enemy-squad.spec.ts
 *
 * Feel:      Always someone coming. At 0 kills the gap is breathable; by MiniBoss
 *            (50) the field is busy; by 500 it is twice as dense, not twice as
 *            tanky (hp stays E01's 8). Empty stretches or a wall of bodies are both
 *            failures.
 * Leveling:  F03 spawnRateMul and patternId. G0 ignores patternId. MiniBoss@50 is
 *            a flag for §7, not a second class here.
 * Graphics:  N/A (E01 silhouette). Lanes mix with meteors so the field reads as one
 *            pressure space, not two games stacked.
 * Pillars:   5 one-more-kill · 4 readable density · 1 visible incoming risk.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * File: poc2/src/systems/enemy-manager.test.ts
 * Runner: vitest
 * Mocks: ObjectPoolPort, DifficultyPort, ColliderRegistryPort, SeekTargetPort,
 *        EnemySquadManager, scene add/remove, BALANCE.enemy.spawn
 *
 * describe('EnemyManager')
 *   it('spawns one enemy when spawnAcc crosses intervalSec')                          // R1, ENM-01
 *   it('interval shrinks as difficulty.spawnRateMul grows')                           // R1
 *   it('spawnOne returns null and does not grow when the pool is exhausted')          // R2, ENM-02
 *   it('releases an enemy that isOffField or hp<=0 the same update')                  // R3, RUL-02
 *   it('owns EnemySquadManager and updates it before live enemies')                   // R4
 *   it('registerTarget on spawn and unregisterTarget on release')                     // R5
 *   it('update does not allocate a new live array')                                   // R6
 *   it('does not instantiate a MiniBoss or archetype class when pendingMilestone is set') // R7
 *   it('does not call DamageSink or DropManager')                                     // R8
 *   it('syncRender forwards to live enemies')                                         // R9
 *   it('dispose clears colliders and the pool')                                       // R10
 *   it('clamps spawnRateMul so interval stays finite')                                // R11
 *   it('pressure ramps with difficulty and population is pooled (acceptance)')        // card
 *
 * Manual:
 *   A-manual-1. [manual] 30s spawn session — heap stable, nothing piles off-field
 *
 * Coverage: R1–R11 + ENM-01 + ENM-02 + RUL-02 + card Acceptance.
 */
