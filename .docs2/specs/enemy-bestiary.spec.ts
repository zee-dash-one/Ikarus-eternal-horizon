/**
 * #tag/enemies #tag/lore
 *
 * Card:         §7 Enemy archetypes & bosses (bestiary) — follow-on to SDD-E01 / E05
 * Hub:          .docs/plans/planning.spec.MD §3.6 (nomenclature) · §5 E01/E05 · §7
 * Requirements: ENM-03, ENM-05, ENM-06, ENM-08, LORE-
 * Change type:  new (catalog; Enemy class stays generic)
 * POC-1 origin: none
 * Test file:    poc2/src/gameobjects/enemy/bestiary.test.ts  (not written yet)
 *
 * Canonical identity of a hostile:  race × class × rank
 * GDD player-facing:                README.md §9
 * Live combat sheets (POC2):        poc2/src/gameobjects/enemy/warrior.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      The bestiary catalog — races, classes, ranks, named uniques, the
 *            identity tuple, and the **weapon loadout** on each ficha (hardpoints
 *            like the ship). Fichas are the design source for names, tier,
 *            slots, starting guns, and **equips** (slots + general; equipment.spec.ts).
 * Does not own: Enemy mesh / squad AI (E01), spawn cadence (E05), Weapon
 *            devices / level tables (D02), EnemyShot pool (E03/E04), Mega Asteroid.
 * Player-facing: the name on a kill and a silhouette readable in <0.3s (class).
 *            Fire pressure is the same guns the player uses (laser first).
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Upstream:
 *   SDD-A01 Balancer     — class hull numbers; weapon stats live on D02 tables
 *   SDD-D02 Weapon       — WeaponId, catalog, L1–L12 rows (damage, rate, volley…)
 *   §7 Equipment         — exclusive slots + general; resolveEquips stamps + mods
 *   SDD-E01 Enemy        — hardpoints + equipWeapon; one pooled class
 *   SDD-E03 / E04        — EnemyShot pool (hostile bolts, not PlayerShot)
 *   SDD-E05 EnemyManager — picks the sheet + stamps default loadout at spawn
 *
 * Downstream:
 *   E05 spawn mix, F03 milestones (MiniBoss@50 / Boss@500), G08 Enemy tab,
 *   G07 kill feed (when it exists), LORE transmissions
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : 2026-08-26  race × class × rank; Maldroid rank names
 * Programming  : 2026-08-26  identity + loadout types — catalog not wired to spawn
 * Game Design  : 2026-08-26  fichas; hardpoints; all start laser L1; equips kit
 * TDD          : 2026-08-26  cases named; test file deferred until catalog code
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: spec-complete (catalog not implemented)
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Identity is data. Enemy stays one class. E05 stamps an identity + combat
 * sheet at activate. DLC races are valid ids that must not spawn in the
 * base game. Rank names exist only for Maldroids; other races TBD.
 *
 * Display name:
 *   unique  → the unique name (Valkaru-5, Apex-Trooper, Omega-Imp, …)
 *   drone   → `${rankName} ${Class}`  e.g. "Private Warrior"
 *
 * Loadout (same catalog as the ship — equipment.spec.ts):
 *   Common W/R/T this pass: 1 exclusive Weapon slot (`laser_lvl_1`), general = [].
 *   Mini-boss 2 / Boss 3 Weapon stamps are later todos.
 *   `equips.slots` is the authored mount; `equips.general` stacks mods.
 *   Resolved damage/rate/speed/radius = D02 row + summed general deltas.
 *   WarriorSheet.weapon is not the combat source (AI cone/range only).
 */

export type EnemyRaceId = 'maldroid' | 'hollow' | 'orc' | 'prismari'

export type EnemyClassId = 'warrior' | 'rogue' | 'tank' | 'special'

export type EnemyTier = 'drone' | 'special' | 'mini-boss' | 'boss' | 'final-boss'

export type EnemyRankNameId =
  | 'scavan'
  | 'recruit'
  | 'cadet'
  | 'private'
  | 'corp'
  | 'lieut'
  | 'cap'
  | 'jok'
  | 'nog'
  | 'chip'
  | 'ace'
  | 'overlord'
  | 'valkaru-5'
  | 'apex-trooper'
  | 'neon-phantom'
  | 'cyber-juggernaut'
  | 'omega-imp'
  | 'malice'

export interface EnemyIdentity {
  readonly race: EnemyRaceId
  readonly classId: EnemyClassId
  readonly rank: number
  readonly nameId: EnemyRankNameId
  readonly displayName: string
  readonly unique: boolean
  readonly dlc: boolean
}

export type WeaponId = 'laser' | 'plasma' | 'beam' | 'mjolnir'

/** equipment.spec.ts — exclusive slots + stacking general. */
export interface EquipsState {
  readonly slots: { readonly weapon: string | null }
  readonly general: readonly string[]
}

export interface EnemyWeaponSlot {
  readonly index: number
  readonly equipped: WeaponId | null
  readonly level: number
}

export interface EnemyLoadout {
  readonly equips: EquipsState
  readonly hardpoints: readonly EnemyWeaponSlot[]
}

export interface EnemyRaceFicha {
  readonly id: EnemyRaceId
  readonly name: string
  readonly dlc: boolean
  readonly blurb: string
}

export interface EnemyClassFicha {
  readonly id: Exclude<EnemyClassId, 'special'>
  readonly name: string
  readonly hp: number
  readonly shieldMax: number
  readonly agility: number
  readonly color: number
  readonly role: string
  /** Drone / common trio: 1 hardpoint. Mini-boss fichas override to 2. */
  readonly hardpointCount: number
}

export interface EnemyRankFicha {
  readonly rank: number
  readonly nameId: EnemyRankNameId
  readonly displayName: string
  readonly tier: EnemyTier
  readonly classId: EnemyClassId
  /** When true, displayName is the unique title (not `${rank} ${class}`). */
  readonly unique: boolean
  readonly dlc: boolean
  readonly notes: string
}

export declare const ENEMY_RACES: readonly EnemyRaceFicha[]
export declare const ENEMY_CLASSES: readonly EnemyClassFicha[]
export declare const MALDROID_RANKS: readonly EnemyRankFicha[]

export declare function hardpointCountFor(tier: EnemyTier): number
export declare function defaultEnemyLoadout(tier: EnemyTier): EnemyLoadout

export declare function maldroidDisplayName(
  rank: EnemyRankFicha,
  classId: Exclude<EnemyClassId, 'special'>,
): string

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   axis     | values                         | player reads as
 *   ---------|--------------------------------|---------------------------
 *   race     | maldroid / hollow / orc /      | skin, faction, DLC
 *            | prismari                       |
 *   class    | warrior / rogue / tank         | silhouette <0.3s (ENM-06)
 *            | special (named uniques only)   | unique silhouette
 *   rank     | 1–12 drones; 13 special;       | name + threat band
 *            | 15 mini-boss; 50 boss;         |
 *            | 1000 final-boss                |
 *
 *   Combat hull numbers for drones come from the class ficha (WarriorSheet today).
 *   Fire is not on that sheet: `equips.slots.weapon` stamps a D02 row then
 *   `equips.general` adds weaponMods (equipment.spec.ts). Rank does not yet
 *   multiply hp.
 *   Named uniques get their own hull sheet when implemented; they still use
 *   the same EquipId catalog.
 *
 *   Common this pass: 1 Weapon slot. Mini-boss 2 / Boss 3 later.
 *   defaultEnemyLoadout.equips.slots.weapon = 'laser_lvl_1'.
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. A spawn identity is always race × class × rank. Missing axis is a bug.
 *   R2. Base game spawns race=maldroid only. hollow / orc / prismari are DLC.
 *   R3. Classes warrior / rogue / tank are the trio. special is reserved for
 *       named uniques that are not that trio (Valkaru-5, Omega-Imp, M.A.L.I.C.E.).
 *   R4. Maldroid drone ranks are exactly 1..12 with the names in MALDROID_RANKS.
 *   R5. Rank 13 is Valkaru-5 (special). Rank 15 is three Mini-bosses that share
 *       the number but not the name. Rank 50 is Omega-Imp. Rank 1000 is
 *       M.A.L.I.C.E. (DLC final-boss).
 *   R6. Mini-boss class mapping is locked: Apex-Trooper=warrior,
 *       Neon-Phantom=rogue, Cyber-Juggernaut=tank.
 *   R7. Rank names are Maldroid-only. Other races do not reuse Scavan…Overlord.
 *   R8. Enemy.ts has no race/class/rank switch. E05 selects the sheet.
 *   R9. DLC identities must not appear in base-game spawn tables.
 *   R10. Display: unique names stand alone; drones are `${rankName} ${Class}`.
 *   R11. POC2 live: Maldroid × {warrior,rogue,tank} × rank 1 (Scavan).
 *        Default spawn sheet is Warrior. Rank scaling is not live.
 *   R12. Every ficha has ship-style hardpoints. Counts: common W/R/T = 1,
 *        Mini-boss W/R/T = 2, Boss (Omega-Imp) = 3. Valkaru-5 = 1.
 *        M.A.L.I.C.E. = 3 (DLC).
 *   R13. Common spawn: `slots.weapon = laser_lvl_1`, `general = []`. Later
 *        equipWeapon rewrites the stamp (plasma_lvl_n, …). Optional general
 *        `enemy_lvl_1_equip` (placeholder) adds damage/rate/speed/radius.
 *        Mini-boss 2 / Boss 3 Weapon stamps are later todos.
 *   R14. Damage, rate, speed, radius start as BALANCE.weapons.levels[id][level]
 *        then add summed general deltas (equipment.spec.ts). Other row fields
 *        stay from the stamp. WarriorSheet.weapon is not a combat source.
 *   R15. Common ships fire the one filled Weapon slot while the AI cone says so.
 *        Energy spend is skipped (always afford); shots spawn on the EnemyShot
 *        pool, never PlayerShot.
 *   R16. Hostile bolt paint stays BALANCE.enemy.shot.color (legibility). Shape
 *        and numbers still follow the resolved equipped-weapon snapshot.
 *   R17. `equips` (slots + general) is authored; equipped-weapon snapshots are derived.
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      N/A (catalog). Silhouette / palette live on the class ficha;
 *              race is a later skin. Named uniques get their own mesh later.
 * Inheritance: N/A
 * syncRender writes: N/A
 * Never writes: combat hp (class sheet / unique sheet)
 * Scene ownership: N/A
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 * Live class hull (POC2, rank 1 Scavan) — not guns:
 *   BALANCE.enemy.warrior  hp 80  shield 40  agility 55  color 0xf43f5e
 *   BALANCE.enemy.rogue    hp 60  shield 30  agility 70  color 0xa78bfa
 *   BALANCE.enemy.tank     hp 140 shield 70  agility 40  color 0xfbbf24
 *   BALANCE.collision.contactIntegrityFrac = 0.2
 *
 * Fire (same tables as the ship — RUL-12, no enemy gun literals):
 *   BALANCE.weapons.catalog              === WEAPONS
 *   BALANCE.weapons.levels.laser         === LASER_LEVELS   // L1 damage/rate/…
 *   BALANCE.weapons.levels.plasma        === PLASMA_LEVELS
 *   BALANCE.weapons.levels.beam          === BEAM_LEVELS
 *   BALANCE.weapons.levels.mjolnir       === MJOLNIR_LEVELS
 *   BALANCE.weapons.loadout              = ['laser','plasma','beam','mjolnir']
 *   defaultEnemyLoadout(tier)            = ['laser_lvl_1'] × N
 *   BALANCE.equips.mods.enemy_lvl_1_equip  // placeholder; deltas TBD (stub 0)
 *
 * Rank, race and unique hull sheets are declared here. They are not BALANCE
 * keys until a catalog implementation pass. Do not invent rank HP multipliers
 * and do not invent a second damage table for enemies.
 *
 * Feel:      Class is the threat you dodge. Rank is how far up M.A.L.I.C.E.'s
 *            chain of command you just shot. Race is who built the hull.
 *            Guns feel like the player's — a Mini-boss with two lasers is two
 *            L1 needles, not a unique "enemy bolt" stat block.
 * Leveling:  F03 spawn-rate + kill milestones (50 Mini-boss / 500 Boss).
 *            Weapon level on a slot is the D02 1–12 table, same as Equips.
 * Graphics:  Class silhouette <0.3s (pillar 4). Hostile shot colour stays
 *            warm (enemy.shot.color) even when the device is laser.
 * Pillars:   4 legibility · 5 one-more-kill · 7 lore earned (names on kills)
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TAXONOMY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   Race   — who they are (faction / species). Skin.
 *   Class  — how they fight (silhouette + sheet). warrior · rogue · tank.
 *   Rank   — how high they sit (level). Maldroid names below; others TBD.
 *
 *   Drone identity example:  Maldroid · Warrior · 4  →  "Private Warrior"
 *   Unique identity example: Maldroid · Rogue   · 15 →  "Neon-Phantom"
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RACE FICHAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── Maldroids ──────────────────────────────────────────────────────────────
 *   id:        maldroid
 *   dlc:       no (base game)
 *   who:       Drones of M.A.L.I.C.E. — the abandoned mining Super-AI, now a
 *              cyber-demonic hive. POC2 ships this race only.
 *   look:      neon machine hulls; class colour (rose / violet / amber)
 *   ranks:     Scavan → Overlord, then named specials / bosses (table below)
 *
 * ── Hollows ────────────────────────────────────────────────────────────────
 *   id:        hollow
 *   dlc:       yes
 *   who:       The Hollowed — clone kin from the GDD faction board. Race name
 *              is Hollows; faction copy may still say "Hollowed".
 *   look:      TBD (class silhouette unchanged)
 *   ranks:     not named in this pass
 *
 * ── Orcs ───────────────────────────────────────────────────────────────────
 *   id:        orc
 *   dlc:       yes
 *   who:       Warlord raiders of the Outer Grids. GDD S1 "orc raids" are this
 *              race, not a skin on Maldroids.
 *   look:      TBD (class silhouette unchanged)
 *   ranks:     not named in this pass
 *
 * ── Prismari ───────────────────────────────────────────────────────────────
 *   id:        prismari
 *   dlc:       yes
 *   who:       Light-beings of the contested nebulae. Hostile when a contract
 *              (or M.A.L.I.C.E. corruption) puts them on the field.
 *   look:      TBD (class silhouette unchanged)
 *   ranks:     not named in this pass
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLASS FICHAS  (combat role — live numbers = rank 1 Maldroid)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── Warrior ────────────────────────────────────────────────────────────────
 *   id:        warrior
 *   hp/shield: 80 / 40
 *   agility:   55
 *   color:     0xf43f5e  neon rose
 *   silhouette: balanced gunship, visible gun points
 *   role:      volume of fire; forces the player to move
 *   morale:    FURY kamikaze (capped) · FLEE on broken shield / group collapse
 *   hardpoints: 1  (common). equips: ['laser_lvl_1']
 *
 * ── Rogue ──────────────────────────────────────────────────────────────────
 *   id:        rogue
 *   hp/shield: 60 / 30
 *   agility:   70
 *   color:     0xa78bfa  violet
 *   silhouette: thin wedge, small radius (0.48)
 *   role:      fragile, fast; lethal if ignored
 *   morale:    same FURY / FLEE triggers; peels harder
 *   hardpoints: 1  (common). equips: ['laser_lvl_1']
 *
 * ── Tank ───────────────────────────────────────────────────────────────────
 *   id:        tank
 *   hp/shield: 140 / 70
 *   agility:   40
 *   color:     0xfbbf24  amber
 *   silhouette: wide, dense hull (radius 0.72)
 *   role:      living shield; blocks lines of fire
 *   morale:    same triggers; slower peel
 *   hardpoints: 1  (common). equips: ['laser_lvl_1']
 *
 * Silhouette rule (ENM-06): class must read in <0.3s. Race skin never changes
 * the shape. special (below) is allowed a unique mesh.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MALDROID RANKS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Drones (rank 1–12) — each rank exists as Warrior, Rogue and Tank.
 * Display = `${Name} ${Class}`  (Scavan Warrior, Ace Rogue, …)
 *
 *   rank | nameId    | display  | tier  | class    | unique | dlc
 *   -----|-----------|----------|-------|----------|--------|-----
 *   1    | scavan    | Scavan   | drone | trio     | no     | no
 *   2    | recruit   | Recruit  | drone | trio     | no     | no
 *   3    | cadet     | Cadet    | drone | trio     | no     | no
 *   4    | private   | Private  | drone | trio     | no     | no
 *   5    | corp      | Corp     | drone | trio     | no     | no
 *   6    | lieut     | Lieut    | drone | trio     | no     | no
 *   7    | cap       | Cap      | drone | trio     | no     | no
 *   8    | jok       | Jok      | drone | trio     | no     | no
 *   9    | nog       | Nog      | drone | trio     | no     | no
 *   10   | chip      | Chip     | drone | trio     | no     | no
 *   11   | ace       | Ace      | drone | trio     | no     | no
 *   12   | overlord  | Overlord | drone | trio     | no     | no
 *
 * Named uniques — display is the title alone. Rank 15 is three Mini-bosses.
 *
 * ── Valkaru-5 ──────────────────────────────────────────────────────────────
 *   rank 13 · special · unique · base game
 *   tier: special
 *   Not warrior / rogue / tank. Own silhouette and hull sheet when implemented.
 *   hardpoints: 1. equips: ['laser_lvl_1']
 *
 * ── Apex-Trooper ───────────────────────────────────────────────────────────
 *   rank 15 · warrior · unique · base game
 *   tier: mini-boss
 *   MiniBoss Warrior: escorted. F03 MiniBoss@50 seam.
 *   hardpoints: 2. equips: ['laser_lvl_1', 'laser_lvl_1']
 *   Pressure is two D02 lasers, not a homemade fire-rate stat.
 *
 * ── Neon-Phantom ───────────────────────────────────────────────────────────
 *   rank 15 · rogue · unique · base game
 *   tier: mini-boss
 *   MiniBoss Rogue: extreme speed, lethal bursts. F03 MiniBoss@50 seam.
 *   hardpoints: 2. equips: ['laser_lvl_1', 'laser_lvl_1']
 *
 * ── Cyber-Juggernaut ───────────────────────────────────────────────────────
 *   rank 15 · tank · unique · base game
 *   tier: mini-boss
 *   MiniBoss Tank: extreme sponge, shields the squadron. F03 MiniBoss@50 seam.
 *   hardpoints: 2. equips: ['laser_lvl_1', 'laser_lvl_1']
 *
 * ── Omega-Imp ──────────────────────────────────────────────────────────────
 *   rank 50 · special · unique · base game
 *   tier: boss
 *   Boss General stand-in: phased patterns, escort. F03 Boss@500 / ENM-08.
 *   Kill-count 500 is the event; rank 50 is the bestiary level of this body.
 *   hardpoints: 3. equips: ['laser_lvl_1', 'laser_lvl_1', 'laser_lvl_1']
 *
 * ── M.A.L.I.C.E. ───────────────────────────────────────────────────────────
 *   rank 1000 · special · unique · DLC only
 *   tier: final-boss
 *   The hive mind itself. Never in the base-game spawn table (R9).
 *   hardpoints: 3. equips: ['laser_lvl_1'] × 3 (DLC may raise later; not in this pass)
 */

/**
 * POC2 (now): every live Enemy is Maldroid · {Warrior|Rogue|Tank} · Scavan
 * with the legacy WarriorSheet.weapon bolt. Loadout (hardpoints + D02 guns)
 * is spec-complete, not wired. Rank mix, uniques, DLC races = later.
 * Mega Asteroid stays an E02/E06 obstacle, not a bestiary race.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * File: poc2/src/gameobjects/enemy/bestiary.test.ts  — write when catalog lands
 * Runner: vitest (`npm run test` in poc2/)
 *
 * describe('Enemy races')
 *   it('enumerates maldroid, hollow, orc, prismari')                                  // R2
 *   it('marks hollow, orc and prismari as DLC')                                       // R2, R9
 *
 * describe('Enemy classes')
 *   it('enumerates warrior, rogue, tank combat classes')                              // R3
 *   it('starts Warrior 80/40, Rogue 60/30, Tank 140/70')                               // class ficha
 *
 * describe('Maldroid ranks')
 *   it('names ranks 1–12 Scavan … Overlord')                                          // R4
 *   it('names rank 13 Valkaru-5 as special')                                          // R5
 *   it('names three distinct Mini-bosses at rank 15')                                 // R5
 *   it('maps Apex-Trooper/Neon-Phantom/Cyber-Juggernaut to warrior/rogue/tank')       // R6
 *   it('names rank 50 Omega-Imp as boss')                                             // R5
 *   it('names rank 1000 M.A.L.I.C.E. as DLC final-boss')                              // R5, R9
 *   it('formats a drone as "{rankName} {Class}"')                                     // R10
 *   it('formats a unique by title alone')                                             // R10
 *
 * describe('Enemy loadout')
 *   it('gives common Warrior/Rogue/Tank one hardpoint')                               // R12
 *   it('gives Mini-bosses two hardpoints and Omega-Imp three')                         // R12
 *   it('fills every slot with laser at level 1')                                       // R13
 *   it('reads damage and rate from LASER_LEVELS, not WarriorSheet.weapon')             // R14
 *   it('allows equipWeapon(slot, plasma) from the ship catalog')                       // R13
 *   it('authors equips; equipped stats are derived (stamp + weaponMod)')               // R17
 *   it('example kit [laser_lvl_1, enemy_lvl_1_equip] adds mod deltas on the stamp')    // R14
 *
 * Manual:
 *   A-manual-1. [manual] playtester names Warrior / Rogue / Tank in <0.3s (ENM-06)
 *   A-manual-2. [manual] kill feed (when it exists) shows Scavan Warrior not "Enemy"
 *   A-manual-3. [manual] a Mini-boss throws two laser volleys; a common throws one
 *
 * Coverage: R1–R17 + ENM-03/06/08 names. Spawn mix / HP rank curve: later pass.
 */
