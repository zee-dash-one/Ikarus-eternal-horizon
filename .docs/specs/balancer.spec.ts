/**
 * #tag/arch #tag/memory
 *
 * Card:         SDD-A01 Balancer
 * Hub:          .docs/plans/planning.spec.MD §5 (card) · §6.1 (DoD) · §6.3 (agents)
 * Requirements: RUL-12
 * Change type:  port (+ type each section as an interface)
 * POC-1 origin: poc/src/core/balancer.ts + poc/src/core/weaponsCatalog.ts  — frozen reference
 * Test file:    poc2/src/core/balancer.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      The typed, read-only `BALANCE` namespace — the single source of every
 *            gameplay, camera, layout, weapon, health, difficulty, score, drop,
 *            vfx, **audio**, **gamepad** and **haptics** number. One interface per section.
 *            Domain modules may define tables; this file is the only hub that
 *            *references* them as initial config (RUL-12).
 *            Debugger-driven tuning slices may mutate at runtime; production code
 *            only reads.
 * Does not own: behaviour, THREE objects, input wiring, weapon factories (those
 *            consume BALANCE). Weapon *data* lives here via catalog + level-table
 *            imports (D02). Dash levels, warrior sheet, squad config, reach-path
 *            defaults and the hit matrix are the same pattern.
 * Player-facing: none directly. Wrong numbers feel like a different game.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Upstream: none.
 * Downstream: every other card. A01 is the base of the graph.
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : hub-v4.2 / 2026-08-17  gamepad + haptics sections (D18)
 * Programming  : hub-v4.2 / 2026-08-17  GamepadConfig / HapticsConfig frozen
 * Game Design  : hub-v4.2 / 2026-08-17  W3C map, deadzone 0.18, rumble presets
 * TDD          : hub-v4.2 / 2026-08-17  cases named; balancer.test.ts extended
 * Status: done
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

export interface Vec3Params {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface PlayfieldLayout {
  readonly width: number
  readonly height: number
}

export interface EnergyConfig {
  readonly start: number
  readonly max: number
  readonly regenPerSec: number
}

export interface MotionConfig {
  readonly maxSpeed: number
  readonly accel: number
  readonly decel: number
  readonly brake: number
}

export interface TiltConfig {
  readonly axis: 'y' | 'z'
  readonly sign: 1 | -1
  readonly maxDeg: number
  readonly riseMs: number
  readonly fallMs: number
}

export interface BytePoolConfig {
  readonly current: number
  readonly max: number
}

export interface ShipCooldowns {
  readonly flickeringMs: number
  readonly shootingMs: number
  readonly dashingMs: number
  readonly recoveringMs: number
}

export interface ModuleMount {
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly size: { readonly w: number; readonly h: number; readonly d: number }
}

export interface ShipModulesConfig {
  readonly layout: {
    readonly wings: readonly [ModuleMount, ModuleMount, ModuleMount, ModuleMount]
    readonly shield: ModuleMount
    readonly bombs: readonly [ModuleMount, ModuleMount]
    readonly collector: ModuleMount
    readonly converter: ModuleMount
  }
  readonly body: Readonly<Record<'light' | 'standard' | 'heavy', { readonly integrity: number; readonly energy: number }>>
  readonly wings: Readonly<Record<'standard' | 'agility' | 'armored', { readonly agility: number; readonly deflection: number }>>
  readonly shield: Readonly<Record<'light' | 'standard' | 'heavy', { readonly shield: number; readonly deflection: number }>>
  readonly collector: Readonly<Record<'passive' | 'wide', { readonly energyGain: number }>>
  readonly converter: Readonly<Record<'scrap' | 'crystal', { readonly labFusion: number }>>
}

export interface ShipStatsConfig {
  readonly byteCap: number
  readonly agility: BytePoolConfig
  readonly deflection: BytePoolConfig
  readonly integrity: BytePoolConfig
  readonly shield: BytePoolConfig
  readonly precision: BytePoolConfig
  readonly energy: BytePoolConfig
}

export interface DebugConfig {
  readonly syncHz: number
}

export interface ShipHealthConfig {
  readonly integrityMax: number
  readonly shieldMax: number
  readonly shieldRegenPerSec: number
  readonly regenDelayMs: number
  readonly hullThresholds: readonly [number, number, number]
  readonly speedMul: readonly [number, number, number, number]
  readonly accelMul: readonly [number, number, number, number]
  readonly fireRateMul: readonly [number, number, number, number]
}

export interface DifficultyConfig {
  readonly miniBossAt: number
  readonly megaAsteroidAt: number
  readonly bossAt: number
  readonly spawnRateMulPerKill: number
}

export interface ScoreConfig {
  readonly enemy: number
  readonly meteor: number
  readonly miniBoss: number
  readonly megaAsteroid: number
  readonly boss: number
  readonly noDamageStreakMul: number
}

export interface DropsConfig {
  readonly magnetRadius: number
  readonly metalScrapChance: number
}

export interface GamepadConfig {
  readonly deadzone: number
  readonly triggerThreshold: number
  readonly invertMoveZ: boolean
  readonly axes: { readonly moveX: number; readonly moveZ: number }
  readonly buttons: {
    readonly fire: number
    readonly switchWeapon: number
    readonly switchBomb: number
    readonly pause: number
    readonly dash: number
    readonly bomb: number
    readonly boost: number
    readonly special: number
  }
}

export interface HapticPreset {
  readonly durationMs: number
  readonly strongMagnitude: number
  readonly weakMagnitude: number
}

export interface HapticsConfig {
  readonly enabled: boolean
  readonly presets: {
    readonly shieldHit: HapticPreset
    readonly hullHit: HapticPreset
    readonly shieldBreak: HapticPreset
    readonly destroyed: HapticPreset
    readonly fireLaser: HapticPreset
  }
}

export interface AudioConfig {
  readonly masterVolume: number
  readonly sfxVolume: number
  readonly musicVolume: number
  readonly muted: boolean
}

export interface Balance {
  readonly layout: {
    readonly playfield: PlayfieldLayout
    readonly collapsePx: number
    readonly areaWidth: string
  }
  readonly gameplay: {
    readonly fireKey: string
    readonly switchKey: string
    readonly pauseKey: string
    readonly energy: EnergyConfig
  }
  readonly controls: {
    readonly motion: MotionConfig
    readonly tilt: TiltConfig
    readonly gamepad: GamepadConfig
  }
  readonly ship: {
    readonly cooldowns: ShipCooldowns
    readonly stats: ShipStatsConfig
    readonly modules: ShipModulesConfig
    readonly health: ShipHealthConfig
  }
  readonly debug: DebugConfig
  readonly camera: {
    readonly fov: number
    readonly position: Vec3Params
    readonly rotation: Vec3Params
    readonly near: number
    readonly far: number
  }
  readonly difficulty: DifficultyConfig
  readonly score: ScoreConfig
  readonly drops: DropsConfig
  readonly vfx: VfxConfig
  readonly audio: AudioConfig
  readonly haptics: HapticsConfig
  readonly loop: { readonly maxFrameDt: number; readonly sidecarHz: number }
}

export declare const BALANCE: Balance

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   BALANCE            | Balance | the singleton namespace
 *   BALANCE.weapons    | catalog + loadout + levels | catalog.ts + weapon-levels.ts
 *   BALANCE.controls.dash.levels | DASH_LEVELS | dash-levels.ts
 *   BALANCE.enemy.squad / warrior / reachPath | domain tables
 *   BALANCE.collision.hitMatrix | HIT_MATRIX | layers.ts
 *
 * No methods. Data only. Debugger writes go through typed setters later (G08),
 * never by reaching into nested objects from gameplay code.
 * Domain files may hold the table literals; BALANCE is the only initial-config hub.
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. Every gameplay number in poc2/src is reachable from BALANCE (RUL-12).
 *   R2. Production code treats BALANCE as read-only (except G08 tuning slices).
 *   R3. New sections required by later cards (health, difficulty, score, drops, vfx,
 *       audio, gamepad, haptics, weapon levels, dash levels, reach-path, hit matrix)
 *       exist in the type even if their first consumer is not yet implemented.
 *   R4. Memory: N/A — no GPU, no pool. Module-level const, created once.
 *   R5. Per-frame allocation: none.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      N/A — no visual
 * Inheritance: N/A (pure data)
 * syncRender writes: N/A
 * Scene ownership: N/A
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * Port from POC-1 (do not retune until a playtest says so):
 *   layout.playfield            = { width: 540, height: 960 }  // portrait 9:16
 *   gameplay.energy             = { start: 100, max: 100, regenPerSec: 8 }
 *   gameplay.fireKey            = 'KeyF'
 *   gameplay.switchKey          = 'KeyG'
 *   gameplay.pauseKey           = 'Escape'
 *   gameplay.bombKey            = 'KeyE'
 *   gameplay.switchBombKey      = 'KeyQ'
 *   gameplay.dashKey            = 'ControlLeft'
 *   controls.motion             = { maxSpeed: 12, accel: 60, decel: 60, brake: 120 }
 *   controls.dash               = { speedMul: DASH_LEVELS[0], durationMs: ship.cooldowns.dashingMs }
 *   controls.tilt               = { axis: 'z', sign: -1, maxDeg: 22, riseMs: 150, fallMs: 200 }
 *   controls.gamepad            = { deadzone: 0.18, triggerThreshold: 0.35, invertMoveZ: false,
 *                                   axes { moveX: 0, moveZ: 1 },
 *                                   buttons { fire: 7, switchWeapon: 4, switchBomb: 5, pause: 9, dash: 6, bomb: 0 } }
 *   controls.mouse              = { fireButton: 0, bombButton: 2, switchBombButton: 1 }
 *   controls.touch              = { enabled: 'auto', stickSize: 120, stickColor: '#22d3ee', deadzone: 0.18 }
 *   camera                      = { fov: 85, position {3,14,6}, rotation {-55,24,-14}, near: 5, far: 10000 }
 *   ship.follow                 = { halfX: 6, halfZ: 8, bounce.timeMs: 500, recenter delay 1500 / still 800 / accel 3 / maxSpeed 12 }
 *   ship.visual                 = { size {1.5,1,2}, wireframe 0x22d3ee, accent 0x6d28d9, thruster 0x60c5ff }
 *   ship.inventory.caps         = { metalScrap: 999, prismaticCrystal: 99, denseCore: 49, darkMatter: 9 }
 *   ship.cooldowns              = { flickeringMs: 2000, shootingMs: 500, dashingMs: 500, recoveringMs: 500 }
 *   ship.stats.byteCap          = 255
 *   ship.stats.{agility,deflection,integrity,shield,precision,energy} = { current: 100, max: 100 }
 *   ship.modules.body           = light {-10, +20} / standard {0,0} / heavy {+25, -10}  // integrity, energy
 *   ship.modules.wings          = standard {0,0} / agility {+25,+5} / armored {+5,+25}  // agility, deflection
 *   ship.modules.shield         = light {15,5} / standard {25,10} / heavy {40,18}       // shield, deflection
 *   ship.modules.collector      = passive {energyGain: 1} / wide {2}
 *   ship.modules.converter      = scrap {labFusion: 1} / crystal {2}
 *   debug.syncHz                = 15  // G08 sidecar; same as loop.sidecarHz
 *   weapons.loadout             = ['laser', 'plasma', 'beam', 'mjolnir']
 *   weapons.catalog             = WEAPONS from catalog.ts (D02; L1 stats from LASER_LEVELS[0])
 *                                 Laser L1: damage 40, rate 10, energyPerShot 0.5
 *   weapons.levels              = LASER_LEVELS / PLASMA_LEVELS / BEAM_LEVELS / MJOLNIR_LEVELS
 *   weapons.levelCount          = 12
 *   controls.dash.levels        = DASH_LEVELS
 *   enemy.reachPath             = DEFAULT_REACH_PATH
 *   collision.hitMatrix         = HIT_MATRIX
 *   collision.contactIntegrityFrac = 0.2  // ram = 20% of current hull/integrity
 *   shot.despawn                = { zNear: 16, zFar: -32, halfX: 16 }  // E04
 *   enemy.spawnLeft/Right/Front = { intervalSec: 1.2, maxActive: 8, … }
 *   enemy.generic / warrior / rogue / tank = sheets (Warrior 80/40, Rogue 60/30, Tank 140/70)
 *   enemy.despawn               = { zNear: 18, zFar: -40, halfX: 22 }
 *   enemy.poolSize              = 48
 *   enemy.squad                 = DEFAULT_SQUAD_CONFIG  // systems/squad-config.ts
 *     maxGroups 6 · maxPerGroup 8 · tickHz 5 · shipsPerTick 12 · maxFury 4
 *     patrolStandoffZ 10 · patrolAdvance 8–18 · groupMaxSpeed 7
 *     Full table: .docs/specs/enemy-squad.spec.ts §4
 *
 * New sections (placeholders, Q08 owns the hull curve). Combat still reads
 * ship.health until C03 consume the C01 integrity/shield bytes; D03 already
 * writes ship.stats.energy; G08 shows ship.stats.
 *   ship.health.integrityMax    = 100
 *   ship.health.shieldMax       = 100
 *   ship.health.shieldRegenPerSec = 2
 *   ship.health.regenDelayMs    = 1500
 *   ship.health.hullThresholds  = [0.75, 0.50, 0.25]
 *   ship.health.speedMul        = [1, 0.85, 0.7, 0.5]
 *   ship.health.accelMul        = [1, 0.85, 0.7, 0.5]
 *   ship.health.fireRateMul     = [1, 0.9, 0.75, 0.55]
 *   difficulty                  = { miniBossAt: 50, megaAsteroidAt: 100, bossAt: 500, spawnRateMulPerKill: 0.002 }
 *   score                       = { enemy: 100, meteor: 25, miniBoss: 2500, megaAsteroid: 5000, boss: 25000, noDamageStreakMul: 1.5 }
 *   drops                       = { magnetRadius: 2.5, metalScrapChance: 0.4 }
 *   vfx.shake.maxAmplitude      = 0.18
 *   vfx.shake.decayPerSec       = 6
 *   vfx.hitStopFrames           = 3
 *   vfx.corpseMs                = 800  // wreck linger / explosion window
 *   vfx.plasmaBurst             = { poolSize: 24, color: 0xfbbf24 }
 *   audio.masterVolume          = 1
 *   audio.sfxVolume             = 1
 *   audio.musicVolume           = 0.65
 *   audio.muted                 = false
 *   haptics.enabled             = true
 *   haptics.presets.shieldHit   = { durationMs: 40,  strongMagnitude: 0.12, weakMagnitude: 0.35 }
 *   haptics.presets.hullHit     = { durationMs: 80,  strongMagnitude: 0.45, weakMagnitude: 0.28 }
 *   haptics.presets.shieldBreak = { durationMs: 180, strongMagnitude: 0.85, weakMagnitude: 0.50 }
 *   haptics.presets.destroyed   = { durationMs: 420, strongMagnitude: 1.00, weakMagnitude: 0.70 }
 *   haptics.presets.fireLaser   = { durationMs: 16,  strongMagnitude: 0.00, weakMagnitude: 0.08 }
 *   loop.maxFrameDt             = 0.05
 *   loop.sidecarHz              = 15
 *
 * Feel:      POC-1 motion and camera are the law. New sections must not leak into
 *            Stage A behaviour — they exist so later cards do not invent literals.
 * Leveling:  weapon levels live on BALANCE.weapons.levels (D02 tables); hull levels live in C03.
 * Graphics:  playfield 540×960; ship cyan/indigo; laser 0x22d3ee. Pillar 4 (legibility).
 * Pillars:   all six — this file is the numeric spine.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * File: poc2/src/core/balancer.test.ts
 * Runner: vitest
 * Mocks: none — import BALANCE
 *
 * describe('BALANCE')
 *   it('exposes a portrait playfield of 540×960')                          // RUL-12, layout
 *   it('exposes energy start=max=100 and regenPerSec=8')                   // POC-1 port
 *   it('exposes motion maxSpeed=12, accel=60, brake=120')                  // feel
 *   it('exposes dynamic camera fov=85 at {3,14,6} / {-55,24,-14}')         // B01 numbers
 *   it('exposes ship.health with four speedMul slots')                     // R3, C03
 *   it('exposes difficulty milestones 50 / 100 / 500')                     // F03
 *   it('exposes score and drops and vfx.shake.maxAmplitude')               // G10 F02 F05
 *   it('exposes audio mixer volumes and default unmuted')                  // §7 SoundManager
 *   it('exposes gamepad W3C map: deadzone 0.18, RT 7, LB 4, Start 9')      // D18, A02
 *   it('exposes D19 action keys, dash, mouse buttons and touch overlay')   // D19, C02 G12
 *   it('exposes haptics presets shieldHit / hullHit / shieldBreak / destroyed') // D18, F05
 *   it('exposes loop maxFrameDt 0.05 and sidecarHz 15')                    // A04, RUL-01
 *   it('exposes ship inventory caps 999 / 99 / 49 / 9')                    // C01, RES-05
 *   it('exposes ship.stats byteCap 255 and spawn pools 100/100')           // C01 sheet, G08
 *   it('exposes enemy.squad maxGroups 6, maxPerGroup 8, tickHz 5, maxFury 4, patrolStandoffZ 10') // E01 squad
 *   it('exposes enemy.poolSize 48 and spawn maxActive 8 per side')           // E05
 *   it('re-exports weapon / dash / squad / reach / collision tables as the initial config hub') // R1
 *   it('treats BALANCE as a frozen object (Object.isFrozen or as const)')  // R2
 *
 * Manual:
 *   A-manual-1. [manual] grep poc2/src for numeric literals with gameplay meaning
 *               outside BALANCE-referenced tables (balancer.ts, catalog.ts,
 *               weapon-levels.ts, dash-levels.ts, warrior.ts, squad-config.ts,
 *               reach-path.ts, layers.ts) — must be empty.
 *
 * Coverage: R1–R5 + card Acceptance ("every tuned number is reachable from BALANCE").
 */
