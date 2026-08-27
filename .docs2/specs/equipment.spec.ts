/**
 * #tag/equipment #tag/weapons
 *
 * Card:         §7 Equipment (EQP- / WPN-07) — equips on every ship ficha
 * Hub:          .docs/plans/planning.spec.MD §7 Equipment · SHIP-10 · WPN-07
 * Requirements: SHIP-10, WPN-07, RUL-12
 * Change type:  new (catalog; Ship / Enemy stay the hosts)
 * POC-1 origin: none
 * Test file:    poc2/src/gameobjects/equipment/equipment.test.ts
 *
 * Shared by player Ship and enemy fichas. Call it **equips**, not kit.
 * Exclusive slots (one EquipId or empty) plus stacking `general[]` mods.
 * Wings/armor/hull module *stats* stay C01 `BALANCE.ship.modules`; the slot
 * id is the source of which module is mounted.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      `equips: { slots, general }` on every ship ficha and `resolveEquips`.
 *            Weapon stamp `{weaponId}_lvl_{n}` copies a D02 row; dash stamp
 *            `dash_lvl_{n}` copies DASH_LEVELS; general mods add damage/rate/
 *            speed/radius. Exclusive slots listed below.
 * Does not own: Weapon devices / LASER_LEVELS tables (D02), Mini-boss/Boss extra
 *            weapon stamps (later), inventory drop `equipment[]` (C01 F02),
 *            Rockets / Engine / Lab behaviour (slot exists, catalog empty).
 * Player-facing: mounting a gun feels like the catalog row; a general buff
 *            tweaks that gun's four fields, it does not invent a second laser.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Upstream:
 *   SDD-A01 Balancer — BALANCE.weapons.levels (stamp source); BALANCE.equips
 *   SDD-D02 Weapon   — WeaponId, WeaponLevelRow, `{id}_lvl_{n}` maps to row n
 *   SDD-C01 Ship     — hosts `loadout.equips` (distinct from inventory.equipment)
 *   SDD-E01 Enemy    — hosts the same object on the ficha
 *
 * Downstream:
 *   G08 Equips + Enemy tabs — slot dropdowns, general list, resolved snapshot
 *   E07 FiringManager — overlays the resolved four-pack (player)
 *   Enemy hardpoints — fire the resolved row (hostile EnemyShot)
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : 2026-08-26  exclusive slots + general; player + enemy
 * Programming  : 2026-08-26  equipment.ts resolveEquips; wired to spawn
 * Game Design  : 2026-08-26  placeholder enemy_lvl_1_equip; deltas TBD (stub 0)
 * TDD          : 2026-08-26  equipment.test.ts
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: done (common 1 Weapon slot this pass)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * `equips` is the authored source of truth. `equippedWeapon` / `weaponLevel` /
 * module `equipped*` are derived — nothing authors them by hand.
 *
 * Exclusive slots (one EquipId or empty), same list in the debugger and BALANCE:
 *   Weapon · Dash · Bomb · Wings · Shield · Armor · Rockets · Engine ·
 *   Collector · Converter · Lab
 *
 * Stacking general: several EquipIds that add fields (this pass: weapon
 * damage / rate / speed / radius only).
 *
 *   resolveEquips({ slots: { weapon: 'laser_lvl_1', … }, general: ['enemy_lvl_1_equip'] })
 *     copy(LASER_LEVELS[0]) then add general mod deltas
 *
 * equipWeapon / setWeaponLevel rewrite `slots.weapon`. Inventory `equipment[]`
 * (drop id) is not this list.
 */

export type WeaponId = 'laser' | 'plasma' | 'beam' | 'mjolnir'

export const EQUIP_SLOT_IDS = [
  'weapon',
  'dash',
  'bomb',
  'wings',
  'shield',
  'armor',
  'rockets',
  'engine',
  'collector',
  'converter',
  'lab',
] as const

export type EquipSlotId = (typeof EQUIP_SLOT_IDS)[number]

/** `{weaponId}_lvl_{n}` with n in 1..12. Example: 'laser_lvl_1'. */
export type WeaponStampId = `${WeaponId}_lvl_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`

/** `dash_lvl_{n}` copies DASH_LEVELS[n-1]. */
export type DashStampId = `dash_lvl_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`

/** Placeholder name — rename later. Additive weapon-stat buff. */
export type GeneralModId = 'enemy_lvl_1_equip'

export type EquipId = string

export interface EquipSlots {
  weapon: EquipId | null
  dash: EquipId | null
  bomb: EquipId | null
  wings: EquipId | null
  shield: EquipId | null
  armor: EquipId | null
  rockets: EquipId | null
  engine: EquipId | null
  collector: EquipId | null
  converter: EquipId | null
  lab: EquipId | null
}

export interface EquipsState {
  slots: EquipSlots
  general: EquipId[]
}

export interface WeaponStampDef {
  readonly kind: 'weapon'
  readonly id: string
  readonly weaponId: WeaponId
  readonly level: number
}

export interface WeaponModDef {
  readonly kind: 'weaponMod'
  readonly id: GeneralModId
  /** Additive. TBD — stub 0 until Game Design locks feel. */
  readonly damage: number
  readonly rate: number
  readonly speed: number
  readonly radius: number
}

/** Derived gun snapshot. Never authored on the ficha. */
export interface ResolvedWeaponStats {
  readonly weaponId: WeaponId
  readonly level: number
  readonly damage: number
  readonly rate: number
  readonly speed: number
  readonly radius: number
  readonly energyPerShot: number
  readonly lifetime: number
  readonly damageDecayPerUnit: number
  readonly aoeRadius: number
  readonly aoeDuration: number
  readonly explosionFoci: number
  readonly forwardShots: number
  readonly diagonalShotsPerSide: number
  readonly diagonalAngleDeg: number
  readonly forwardSpread: number
  readonly width: number
  readonly length: number
  readonly angleDeg: number
  readonly ticksPerSec: number
  readonly dps: number
  readonly energyPerSec: number
}

export interface ResolveEquipsResult {
  readonly weapon: ResolvedWeaponStats | null
  readonly dash: { readonly level: number; readonly energyCost: number; readonly speedMul: number } | null
}

export declare function parseWeaponStamp(id: string | null | undefined): WeaponStampDef | null

export declare function resolveEquips(equips: EquipsState): ResolveEquipsResult

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   field            | type        | meaning
 *   -----------------|---------|------------------------------------------
 *   equips.slots     | EquipSlots  | exclusive mounts (one each)
 *   equips.general   | EquipId[]   | stacking mods
 *   equippedWeapon   | snapshot    | derived from slots.weapon + general
 *
 *   parseWeaponStamp('laser_lvl_1') → { kind:'weapon', weaponId:'laser', level:1 }
 *   resolveEquips(state) — weapon slot stamp + sum(general) onto four-pack.
 *   Other row fields (volley, aoe, beam, energyPerShot, …) stay from the stamp.
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. Every player Ship and enemy ficha has `equips: { slots, general }`.
 *   R2. Exclusive slots this pass: Weapon, Dash, Bomb, Wings, Shield, Armor,
 *       Rockets, Engine, Collector, Converter, Lab. General is a stacking list.
 *   R3. Weapon stamp id is `{weaponId}_lvl_{n}` with n in 1..12. It copies
 *       BALANCE.weapons.levels[weaponId][n-1]. Dash stamp copies DASH_LEVELS.
 *       Existing module ids stay on Wings/Shield/Armor/Collector/Converter.
 *       Rockets / Engine / Lab: slot exists, catalog empty this pass.
 *   R4. Common W/R/T: 1 Weapon slot. Mini-boss 2 / Boss 3 are later todos.
 *   R5. All general weaponMod entries apply to the filled Weapon slot:
 *       resolved.x = row.x + sum(mod.x) for x in damage, rate, speed, radius.
 *   R6. equippedWeapon / weaponLevel / equippedWings etc. are derived.
 *   R7. equipWeapon / setWeaponLevel rewrite `slots.weapon`. They do not
 *       write equippedWeapon by hand.
 *   R8. Distinct from C01 inventory `equipment[]` (owned drop stacks).
 *   R9. Default equips (this pass):
 *         player  → slots.weapon = laser_lvl_1, slots.dash = dash_lvl_1,
 *                   wings/armor = standard, rest empty, general = []
 *         common enemy → slots.weapon = laser_lvl_1, rest empty, general = []
 *   R10. enemy_lvl_1_equip is a placeholder id. Deltas TBD (stub 0).
 *   R11. Player energy spend uses the resolved device (D03) after stamp+mod.
 *        Enemies skip energy (always afford). Hostile paint stays enemy.shot.color.
 *   R12. FiringManager overlays the resolved four-pack after applyLevel.
 *        Enemy _tryFire / _fireBolt use the snapshot; AI cone/range stay on
 *        the Warrior sheet (fireConeDeg, intelligence).
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      N/A (catalog). Debugger lists slot dropdowns, general add/remove,
 *              and read-only resolved damage/rate/speed/radius.
 * Inheritance: N/A
 * syncRender writes: N/A
 * Never writes: D02 tables
 * Scene ownership: N/A
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * Stamp source (already live):
 *   BALANCE.weapons.levels.laser   === LASER_LEVELS
 *   BALANCE.weapons.levels.plasma  === PLASMA_LEVELS
 *   BALANCE.weapons.levels.beam    === BEAM_LEVELS
 *   BALANCE.weapons.levels.mjolnir === MJOLNIR_LEVELS
 *   BALANCE.controls.dash.levels   === DASH_LEVELS
 *
 *   BALANCE.equips.catalog === EQUIP_CATALOG
 *   BALANCE.equips.mods.enemy_lvl_1_equip = { damage: 0, rate: 0, speed: 0, radius: 0 }
 *     // placeholder id; feel values TBD — do not invent
 *   BALANCE.equips.defaults.player / enemy  // slot maps
 *   BALANCE.enemy.shot.color  // hostile bolt paint
 *
 * Feel:      Equips, not a second gun. Laser L1 is Laser L1 until a buff
 *            nudges the four fields.
 * Leveling:  weapon stamps are D02 1–12. Mods are a later feel table.
 * Graphics:  N/A this pass (no new mesh). Hostile bolts stay warm (E03).
 * Pillars:   4 legibility (same guns) · WPN-07 equipment changes weapon behavior.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * File: poc2/src/gameobjects/equipment/equipment.test.ts
 * Runner: vitest (`npm run test` in poc2/)
 *
 * describe('weapon stamps')
 *   it('parses laser_lvl_1 as weapon laser level 1')                                  // R3
 *   it('copies LASER_LEVELS[0] damage/rate/speed/radius onto the snapshot')            // R3
 *   it('fills the exclusive weapon slot from the stamp id')                           // R4
 *
 * describe('weapon mods')
 *   it('adds enemy_lvl_1_equip deltas onto damage/rate/speed/radius')                 // R5, R10
 *   it('does not change volley or aoe from the stamp')                                // R5
 *
 * describe('ficha kit')
 *   it('keeps equippedWeapon derived from equips')                                    // R6
 *   it('does not treat inventory equipment[] as the kit list')                        // R8
 *   it('defaults a common ficha to laser_lvl_1')                                      // R9
 *
 * Manual:
 *   A-manual-1. [manual] Equips tab shows laser_lvl_1 and resolved L1 numbers
 *   A-manual-2. [manual] adding enemy_lvl_1_equip (when deltas ≠ 0) changes fire feel
 *
 * Coverage: R1–R12 + SHIP-10 / WPN-07 names. Feel numbers: later Game Design.
 */
