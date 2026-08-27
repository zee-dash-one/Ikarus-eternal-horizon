# Ikarus Eternal Horizon — CHAR — Craft Sheet

tag_g_char_sheet tag_g_combat
RESUME: Every craft — 54 slots, Full/Summary publish, integrity states, recalc triggers, damage path with precomputed MIT.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.18

Applies to **player and enemies**. Historical draft: [`../consider/char_sheet.MD`](../consider/char_sheet.MD) (this file wins on conflicts).

**This pass:** lock the **data contract** (`CHAR-01` slots · `CHAR-02` Full Sheet · `CHAR-03` Summary). Recalc (`CHAR-05`) and hit path (`CHAR-06`) keep their rule tables; SDD test files for those IDs wait until this contract is signed.

---

## Scope (Orchestrator)

tag_g_char_sheet tag_s_char_equip_slots tag_s_char_full_sheet_families tag_s_char_summary_sheet
RESUME: Theme 3 data plane — one TypeScript contract for Core, Pause Balancer, and future content records.

| In | Out |
| --- | --- |
| Slot layout, Full Sheet families, published Summary codes, integrity-state union, empty-sheet defaults | Recalc algorithm tests (`CHAR-05`), damage apply tests (`CHAR-06`), BALANCE feel numbers (`Q01`), Three.js / HUD View |
| Shared types the **Pause → Dev Balancer** binds (`SCENE-05`) | `/dev/*` CRUD form chrome (`DEV-10` UI still defer; grant types locked in `EQP-01`) |

Every craft instance is a `CharSheet` (`full` + `summary`). Frame systems and HUD read **`summary` only** (`D07`). The Balancer may read **both** layers.

Owner: `CharSheetManager` ([`nomenclature.spec.MD`](./nomenclature.spec.MD) · `D22`).

**Code home (when Theme 3 implements):** `poc3/src/core/sheet/` (types + empty factory) · `poc3/src/systems/char-sheet-manager.ts` (lifecycle / recalc). Golden Rule: no `three` / DOM (`ARCH-16`).

---

## Requires (Orchestrator)

| Need | Source | Status |
| --- | --- | --- |
| Summary codes + sheet-layer vocabulary | [`nomenclature.spec.MD`](./nomenclature.spec.MD) | closed |
| 12 Special slot names incl. dual weapons | `D08` | closed |
| Op order `_cur` / `_max` / `_mod` / `_mul` | `D09` · `D10` · `D11` | closed |
| Frame reads Summary only; `MIT` precomputed | `D07` · `D24` | closed |
| Equip grants feed families via registered `*_mod` / `*_mul` | [`equipment.spec.MD`](./equipment.spec.MD) `EQP-01` data contract | closed |
| Integrity ladder names | `D06` · `CHAR-04` | closed (transitions tested later) |
| Balancer binds live sheet | [`scenes.spec.MD`](./scenes.spec.MD) `SCENE-05` Dev tab | closed (UI later) |
| `poc3/` scaffold + Golden Rule lint | Theme 0 · `ARCH-16`/`ARCH-20` | **open for implementation** — does not block this contract |

Sign-off for **data contract**: Orchestrator — types below are the Theme 3 SoT. Do not implement `CHAR-04`–`CHAR-06` production code until `CHAR-01`–`CHAR-03` SDD files exist (they do, under `.docs3/specs/char/`).

---

## Data contract (Programming)

tag_g_char_sheet tag_s_char_equip_slots tag_s_char_full_sheet_families tag_s_char_summary_sheet tag_s_char_integrity_states tag_s_char_mitigation_mit
RESUME: Locked TypeScript shapes — Core, Balancer, and tests import the same types; empty craft always exposes 54 slots.

Sketch — **not** production code. Production copies these names into `poc3/src/core/sheet/`. English identifiers only (`D05`); slot `Converter` (not Portuguese `Conversor`).

### Memory / Fields

| Rule | Detail |
| --- | --- |
| Fixed occupancy | `special` is a full `Record<SpecialSlotId, …>` (12 keys). `generic.length === 21`. `effects.length === 21`. Length never changes at runtime. |
| Empty is valid | `itemId: null` on any occupant. Sheet still publishes Summary. |
| Zero alloc on hot path | Slot arrays and family objects are allocated at `create`. Recalc mutates in place / republishes a reused `summary`. No `push` / `new` per frame. |
| `mul` identity | Unequipped multiplicative accumulators start at **`1`**, not `0`. |
| `mod` / `baseSum` identity | Start at **`0`**. |
| `LVL` | Integer ≥ 1. Empty craft `LVL = 1`. |
| Summary write | **No system patches `summary` fields** except `CharSheetManager` recalc (`CHAR-05`). |
| Balancer | Pause Dev inner tab **Ship** binds these fields (read Full + Summary; writes go through Manager commands, not raw mutation). |

### Types

```typescript
export const SPECIAL_SLOT_IDS = [
  'Primary_Weapon',
  'Secondary_Weapon',
  'Dash',
  'Bomb',
  'Wings',
  'Shield',
  'Armor',
  'Rockets',
  'Engine',
  'Collector',
  'Converter',
  'Lab',
] as const;

export type SpecialSlotId = (typeof SPECIAL_SLOT_IDS)[number];

export const SPECIAL_SLOT_COUNT = 12;
export const GENERIC_SLOT_COUNT = 21;
export const EFFECT_SLOT_COUNT = 21;
export const CHAR_SLOT_COUNT = 54; // 12 + 21 + 21

export type IntegrityState = 'LIGHT' | 'MEDIUM' | 'SEVERE' | 'DRIFTING' | 'DEAD';

export type SummaryCode =
  | 'ENE' | 'SHD' | 'DEF' | 'MIT' | 'SPD' | 'S_D' | 'S_R' | 'REG' | 'LVL' | 'HP';

/** Occupant of a Special or Generic slot. */
export interface SlotOccupant {
  /** Catalog item id. `null` = empty (`CHAR-01`). */
  itemId: string | null;
}

/** Occupant of an Effect slot (`CHAR-01` · `D11`). */
export interface EffectSlotOccupant extends SlotOccupant {
  remainingDurationTicks: number;
  cooldownRemainingTicks: number;
}

/** Primary family — `D10`: `cur = baseSum + mod`; `max = baseSum × mul`. */
export interface PrimaryFamily {
  baseSum: number;
  cur: number;
  max: number;
  mod: number;
  mul: number;
}

/** Derived family — `cur` shape locked in `CHAR-02`. No `max` on this layer. */
export interface DerivedFamily {
  base: number;
  mod: number;
  mul: number;
  cur: number;
}

/** Full Sheet only — read at craft start (`EQP-03`), never per combat frame. */
export interface LabCraftTimeFamily {
  mod: number;
  mul: number;
}

export type PrimaryFamilyKey =
  | 'agility'
  | 'deflection'
  | 'precision'
  | 'integrity'
  | 'shield'
  | 'energy';

export type DerivedFamilyKey = 'speed' | 'damage' | 'shotRate' | 'defense';

export interface FullSheet {
  special: Record<SpecialSlotId, SlotOccupant>;
  generic: SlotOccupant[];       // length === GENERIC_SLOT_COUNT
  effects: EffectSlotOccupant[]; // length === EFFECT_SLOT_COUNT
  agility: PrimaryFamily;
  deflection: PrimaryFamily;
  precision: PrimaryFamily;
  integrity: PrimaryFamily;
  shield: PrimaryFamily;
  energy: PrimaryFamily;
  speed: DerivedFamily;
  damage: DerivedFamily;
  shotRate: DerivedFamily;
  defense: DerivedFamily;
  labCraftTime: LabCraftTimeFamily;
}

/**
 * Only sheet frame systems / HUD / AI may read (`D07`).
 * `MIT` is a stored field, not a getter over `DEF` (`D24`).
 */
export interface SummarySheet {
  ENE: number;
  SHD: number;
  DEF: number;
  MIT: number;
  SPD: number;
  S_D: number;
  S_R: number;
  REG: number;
  LVL: number;
  HP: number;
  integrityState: IntegrityState;
}

export interface CharSheet {
  readonly full: FullSheet;
  readonly summary: SummarySheet;
}
```

### Empty-craft defaults (`create()`)

| Field | Default |
| --- | --- |
| All `itemId` | `null` |
| Effect tick counters | `0` |
| Primary `baseSum` / `cur` / `max` / `mod` | `0` |
| Primary / derived / lab `mul` | `1` |
| Derived `base` / `mod` / `cur` | `0` |
| Lab `mod` | `0` |
| Summary numeric codes | `0` except `LVL = 1` |
| `integrityState` | `LIGHT` |

`HP = integrity_cur + shield_cur` (both 0 → `HP = 0`). Empty `MIT = 0`.

### Rules (slot / family — data layer)

- Special items equip only in the matching Special key (`D08` / `D09` type-gate). Generic items only in `generic[i]`. Effects only in `effects[i]`.
- Occupant stores **`itemId` only**. Grant payloads live on the item catalog (`EQP-01`); the sheet does not duplicate `*_mod` literals on the slot.
- Effect occupants may hold duration/cooldown ticks; they do not rewrite stored Full Sheet equip totals (`CHAR-05`).

---

## View (Programming)

**N/A this pass.** Sheet is Core data (`D40`). HUD consumes `summary` later (`HUD-01`). Pause Balancer Ship tab binds these fields under `SCENE-05` — no mesh, no DOM in `core/`.

---

## BALANCE (Game Design)

**N/A this pass** — data shape only. Family base stubs and class kits (`Q01`, `D18`) land when `CHAR-02` implementation goes green. Do not put feel numbers in this contract.

Reserved keys (do not invent others for sheet math):

| Key | When |
| --- | --- |
| `BALANCE.sheet.empty` | Optional override of empty defaults — default is the table above |
| `BALANCE.sheet.integrityBands` | `CHAR-04` (½ / ¼ thresholds) — not this pass |
| `BALANCE.sheet.integritySpeedMul` | `CHAR-04` (1.0 / 0.8 / 0.5 / 0.1) — not this pass |

---

## `CHAR-01` — Equip slots

tag_s_char_equip_slots tag_s_combat_weapon_fire

Every craft exposes **54** slots:


| Group   | Count  | Rule                                                                                                                                                |
| ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Special | **12** | One of each: `Primary_Weapon`, `Secondary_Weapon`, `Dash`, `Bomb`, `Wings`, `Shield`, `Armor`, `Rockets`, `Engine`, `Collector`, `Converter`, `Lab` |
| Generic | **21** | Untyped; accept any generic-attribute item                                                                                                          |
| Effect  | **21** | Timed effects with duration/cooldown only                                                                                                           |


- Special items equip only in the matching Special slot.
- Effects need a free Effect slot (or explicit replace).
- Empty slots are valid; sheet still publishes.

## `CHAR-02` — Full Sheet families

tag_s_char_full_sheet_families tag_s_char_effect_slots

**Primary families** (`_cur` / `_max` / `_mod` / `_mul`), fed by Special + Generic items (`D09`, `D10`):


| Family     | Code | `cur`                      | `max`                      |
| ---------- | ---- | -------------------------- | -------------------------- |
| Agility    | AGI  | `baseSum + agility_mod`    | `baseSum × agility_mul`    |
| Deflection | DFL  | `baseSum + deflection_mod` | `baseSum × deflection_mul` |
| Precision  | PRE  | `baseSum + precision_mod`  | `baseSum × precision_mul`  |
| Integrity  | INT  | `baseSum + integrity_mod`  | `baseSum × integrity_mul`  |
| Shield     | SHD  | `baseSum + shield_mod`     | `baseSum × shield_mul`     |
| Energy     | ENE  | `baseSum + energy_mod`     | `baseSum × energy_mul`     |


`baseSum` = sum of raw grants from equipped items for that family. `_mod` / `_mul` are independent accumulators from other grants.

**Derived families:**


| Family    | `cur` (locked shape)                                                             |
| --------- | -------------------------------------------------------------------------------- |
| Speed     | `(speed_base + speed_mod + agility_cur) × speed_mul`                             |
| Damage    | `(damage_base + damage_mod + precision_cur) × damage_mul`                        |
| Shot Rate | `(shot_rate_base + shot_rate_mod + precision_cur + agility_cur) × shot_rate_mul` |
| Defense   | `(defense_cur + defense_mod) × defense_mul`                                      |


Effect slots are the channel for temporary Shot Rate / Defense modifiers (`D11`).

## `CHAR-03` — Summary Sheet

tag_s_char_summary_sheet tag_s_char_mitigation_mit

Published fields = [`nomenclature.spec.MD`](./nomenclature.spec.MD) (Summary Sheet codes) **plus** `integrityState` (hub runtime list). **No system edits Summary directly** — only recalc (`CHAR-05`).

Derived combat helpers such as **`MIT`** are published here so frame systems stay branch-light (`D24`).

## `CHAR-04` — Integrity states (`D06`)

tag_s_char_integrity_states tag_s_combat_damage_apply


| State    | Condition                                               | Effect on Summary          |
| -------- | ------------------------------------------------------- | -------------------------- |
| LIGHT    | `integrity_cur ≥ integrity_max / 2`                     | none                       |
| MEDIUM   | `integrity_max / 4 ≤ integrity_cur < integrity_max / 2` | `SPD` and `S_R` at **80%** |
| SEVERE   | `0 < integrity_cur < integrity_max / 4`                 | `SPD` and `S_R` at **50%** |
| DRIFTING | `integrity_cur = 0`                                     | `SPD` and `S_R` at **10%** |
| DEAD     | next damage while DRIFTING                              | craft destroyed            |


Penalties apply to **Summary** `SPD`/`S_R` after publish, not by rewriting Full Sheet speed/shot_rate. Re-evaluate state on every damage application.

Player: **DEAD → run over** (Q04).

## `CHAR-05` — Recalc triggers (`D07`, `D12`, `D24`)

tag_s_char_recalc_triggers tag_s_char_mitigation_mit tag_s_char_equip_slots tag_s_char_effect_slots


| Trigger                          | Recalc                                                        |
| -------------------------------- | ------------------------------------------------------------- |
| Equip/unequip Special or Generic | Full Sheet → new Summary (includes `DEF` → `MIT`)             |
| Effect activate / expire         | Summary only (Full untouched); refresh `DEF`/`MIT` if touched |
| `LVL` change                     | Summary terms `DEF`, `MIT`, `SPD`, `S_D` only                 |
| Context toggle (`dashing`, `shield_empty`, integrity band) | Summary-only patch for active `when` grants (`EQP-01`) |


## `CHAR-06` — Damage, collision, regen

tag_g_combat tag_s_combat_damage_apply tag_s_char_mitigation_mit tag_s_combat_shield_absorb tag_s_combat_collision_layers
RESUME: Hit path uses precomputed `MIT`, shield-first absorption, integrity damage, ship–ship exchange, and collision layers.


| Rule                | Definition |
| ------------------- | ---------- |
| Incoming damage     | **Runtime:** `dealt = max(0, incoming − MIT)` then absorb on `SHD` first; remainder on Integrity. `MIT` is **already** on the Summary Sheet (`MIT = DEF / 10`, published at recalc — `D24`). Do **not** evaluate `DEF / 10` on each hit. |
| Mitigation publish  | Whenever `DEF` is rebuilt (equip change, relevant effect, `LVL` change), set `MIT = DEF / 10` in the same recalc pass. |
| Ship–ship collision | each takes **other.**`HP` **/ 2** (`D13`) |
| Layers              | matrix over `D14` layers; friendly fire impossible unless matrix allows |
| Regen               | `REG` from Summary; sources come from equip/effects only |


## Requirements (`CHAR-`)



| ID        | Prio | Requirement                                                       | Acceptance                                        |
| --------- | ---- | ----------------------------------------------------------------- | ------------------------------------------------- |
| `CHAR-01` | must | 54 slots (12 Special incl. dual weapons + 21 Generic + 21 Effect) | Instance always exposes the full slot set         |
| `CHAR-02` | must | Full Sheet families with `D09`/`D10` math                         | Item equip changes published Summary after recalc |
| `CHAR-03` | must | Summary Sheet is the only runtime sheet; includes precomputed `MIT` | Frame systems never read Full Sheet; never recompute `DEF/10` on hit |
| `CHAR-04` | must | LIGHT→DEAD integrity ladder incl. DRIFTING                        | Integrity 0 = DRIFTING; next hit = DEAD            |
| `CHAR-05` | must | Recalc triggers per [`char-sheet.spec.MD`](./char-sheet.spec.MD) (`CHAR-05`); `MIT` refreshed with `DEF`              | Effect expiry does not rewrite Full Sheet; equip/`LVL` republish `MIT` |
| `CHAR-06` | must | Hit path uses `MIT` → SHD → INT; collision `D13`/`D14`            | Shield absorbs before Integrity; no per-hit DEF math |
