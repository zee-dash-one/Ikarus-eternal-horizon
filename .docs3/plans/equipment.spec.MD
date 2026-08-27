# Ikarus Eternal Horizon — Equipment — Modifier Grants

tag_g_equipment tag_s_equip_mod_mul_grants tag_s_equip_contextual_mods tag_s_equip_lab_craft_mods tag_s_equip_item_schema
RESUME: Equip items grant only registered *_mod / *_mul fields; contextual when-bundles; lab craft time modifiers.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.19

Satellite: [`../../.docs2/plans-later/equipments-plan.spec.MD`](../../.docs2/plans-later/equipments-plan.spec.MD) (coverage only).

**This pass:** lock the **data contract** (`EQP-01` registry + item schema · `EQP-02` `when` union · `EQP-03` lab fields on the registry). Contextual toggle behaviour and craft-timer reads keep their rule tables; those SDD cases stay `it.todo` until Theme 4 / 12.

---

## Scope (Orchestrator)

tag_g_equipment tag_s_equip_item_schema tag_s_equip_mod_mul_grants
RESUME: Catalog types shared by CharSheetManager lookup, Pause Balancer, and `/dev/*` content records.

| In | Out |
| --- | --- |
| Modifier registry, grant `{ field, value, when? }`, Special / Generic / Effect item shapes, orphan-field reject | Recalc after equip (`CHAR-05`), dash/shield/integrity context patch runtime (`EQP-02`), craft-start timer (`EQP-03`), BALANCE catalog numbers, weapon/dash/bomb **behaviour** profiles |
| Same types Pause Dev **Equips** tab and `DevContentManager` export | `/dev` form chrome (`DEV-10` UI still defer) |

Slots on the CHAR sheet store **`itemId` only** ([`char-sheet.spec.MD`](./char-sheet.spec.MD)). Grant payloads live **here**. `CharSheetManager` resolves `itemId` → catalog row on equip/recalc (`D09`).

No new `*Manager` this pass — the catalog is data (`BALANCE.equipment` / exported content JSON). Runtime owner of apply/recalc remains `CharSheetManager` (`D22`).

**Code home (when implemented):** `poc3/src/core/equipment/` (registry + types + `isRegisteredGrantField`). Golden Rule: no `three` / DOM (`ARCH-16`).

---

## Requires (Orchestrator)

| Need | Source | Status |
| --- | --- | --- |
| 12 Special slot ids for Special items | `CHAR-01` · `D08` | closed |
| Full Sheet family keys (`agility` … `energy`, derived, lab) | `CHAR-02` | closed |
| Op order `_mod` additive / `_mul` multiplicative | `D10` · `D29` | closed |
| Recalc on equip unchanged | `CHAR-05` | closed (runtime later) |
| Pause Balancer / `/dev` bind | `SCENE-05` · `DEV-*` | closed (UI later) |
| `poc3/` scaffold | Theme 0 | **open for implementation** — does not block this contract |

Sign-off for **data contract**: Orchestrator — types below are the EQP SoT. Do not implement live dash-context patch or craft-timer production code until `EQP-01`–`EQP-03` SDD files exist (they do, under `.docs3/specs/equipment/`).

---

## Data contract (Programming)

tag_g_equipment tag_s_equip_item_schema tag_s_equip_mod_mul_grants tag_s_equip_contextual_mods tag_s_equip_lab_craft_mods
RESUME: Locked TypeScript shapes — catalog rows grant only registered fields; Balancer and Dev CRUD serialize the same objects.

Sketch — **not** production code. Production copies these names into `poc3/src/core/equipment/`. Import `SpecialSlotId` / `PrimaryFamilyKey` from the CHAR contract — **do not duplicate** slot id lists.

### Memory / Fields

| Rule | Detail |
| --- | --- |
| Data-only items | A row is `id` + `grants` (+ slot gate / duration). No damage literals, no dash impulse, no bomb payload (`WPN-*` / `PlayerManager` read Summary after recalc). |
| Empty grants | Valid — item may only occupy a slot (e.g. weapon whose profile lives in `BALANCE.weapons`). |
| Orphan fields | Any `grant.field` not in `BASE_SUM_FIELDS` ∪ `MODIFIER_FIELDS` is **invalid**. Catalog load / Dev save must reject. |
| `when` omitted | Grant is **always** — included in every Full Sheet recalc while equipped. |
| Contextual `when` | Does **not** rewrite stored Full Sheet equip totals; Summary patch on toggle (`CHAR-05`). |
| Derived `base` | `speed_base` / `damage_base` / `shot_rate_base` / `defense` base are **not** item grants. They come from craft/class template (`D18`, `Q01`). Items use `speed_mod` / `speed_mul` (etc.). |
| Primary `baseSum` | Allowed item grant: `field` is a `PrimaryFamilyKey` (`agility` … `energy`). Feeds `FullSheet.{family}.baseSum` (`EQP-01` item rule). |
| Lab fields | `lab_craft_time_mod` / `lab_craft_time_mul` are on the modifier registry and on Full Sheet only (`EQP-03`). |
| Balancer | Pause Dev inner tab **Equips** binds `EquipCatalog`; writes go through catalog replace + `CharSheetManager` recalc, not raw slot mutation. |
| Zero alloc | Catalog is static after boot. Recalc must not allocate grant arrays per frame. |

### Types

```typescript
import type { SpecialSlotId, PrimaryFamilyKey } from '../sheet/char-sheet';

/** Raw primary-family feed → FullSheet.{family}.baseSum */
export const BASE_SUM_FIELDS = [
  'agility',
  'deflection',
  'precision',
  'integrity',
  'shield',
  'energy',
] as const satisfies readonly PrimaryFamilyKey[];

export type BaseSumField = (typeof BASE_SUM_FIELDS)[number];

/** Exhaustive `*_mod` / `*_mul` registry (`D29`). */
export const MODIFIER_FIELDS = [
  'agility_mod', 'agility_mul',
  'deflection_mod', 'deflection_mul',
  'precision_mod', 'precision_mul',
  'integrity_mod', 'integrity_mul',
  'shield_mod', 'shield_mul',
  'energy_mod', 'energy_mul',
  'speed_mod', 'speed_mul',
  'damage_mod', 'damage_mul',
  'shot_rate_mod', 'shot_rate_mul',
  'defense_mod', 'defense_mul',
  'lab_craft_time_mod', 'lab_craft_time_mul',
] as const;

export type ModifierField = (typeof MODIFIER_FIELDS)[number];

export type GrantField = BaseSumField | ModifierField;

export const GRANT_CONTEXTS = [
  'dashing',
  'shield_empty',
  'integrity_severe',
] as const;

export type GrantContext = (typeof GRANT_CONTEXTS)[number];

export interface EquipGrant {
  field: GrantField;
  value: number;
  /** Omitted = always (Full Sheet recalc). */
  when?: GrantContext;
}

export interface EquipItemBase {
  id: string;
  displayName: string;
  grants: readonly EquipGrant[];
  tags?: readonly string[];
}

export interface SpecialEquipItem extends EquipItemBase {
  kind: 'special';
  specialSlot: SpecialSlotId;
}

export interface GenericEquipItem extends EquipItemBase {
  kind: 'generic';
}

/**
 * Effect-slot buff — same grant fields; duration/cooldown on the occupant
 * (`CHAR-01`). Active grants patch Summary only (`CHAR-05`).
 */
export interface EffectItem extends EquipItemBase {
  kind: 'effect';
  durationTicks: number;
  cooldownTicks: number;
}

export type EquipItem = SpecialEquipItem | GenericEquipItem;

export interface EquipCatalog {
  special: readonly SpecialEquipItem[];
  generic: readonly GenericEquipItem[];
  effects: readonly EffectItem[];
}

export function isRegisteredGrantField(field: string): field is GrantField;
// production: membership in BASE_SUM_FIELDS ∪ MODIFIER_FIELDS
```

### Empty / identity

| Field | Default |
| --- | --- |
| Catalog arrays | `[]` (valid) |
| `grants` | `[]` (valid) |
| Effect `durationTicks` / `cooldownTicks` | `0` allowed (instant / no cooldown — semantics at activate) |

### Rules (data layer)

- Special rows **must** set `specialSlot` to one of the 12 CHAR keys. `CharSheetManager` type-gates: item only enters that Special occupant (`D08` / `D09`).
- Generic rows **must not** carry `specialSlot`.
- Effect rows **must not** enter Special/Generic occupants.
- `*_mod` values are additive; `*_mul` values are multiplicative factors (`D10`). Do not encode “15% faster” as a second shape — use `lab_craft_time_mul: 0.85` in **BALANCE**, not in this type.
- Unknown `when` strings are invalid (same reject path as orphan `field`).

---

## View (Programming)

**N/A this pass.** Catalog is Core data. Pause Balancer Equips tab and `/dev/*` forms bind these fields later (`SCENE-05`, `DEV-07`/`DEV-10`).

---

## BALANCE (Game Design)

**N/A this pass** — data shape only. Example item **names** below are design intent; numbers land in `BALANCE.equipment` when Theme 12 / catalog stubs go green (`Q01`).

Reserved keys:

| Key | When |
| --- | --- |
| `BALANCE.equipment.special` | `SpecialEquipItem[]` |
| `BALANCE.equipment.generic` | `GenericEquipItem[]` |
| `BALANCE.equipment.effects` | `EffectItem[]` |

---

## `EQP-01` — Equip items and `*_mod` / `*_mul` grants (`D29`)

tag_g_equipment tag_s_equip_mod_mul_grants tag_s_equip_contextual_mods tag_s_equip_lab_craft_mods
RESUME: Every equip item is data-only grants into the CHAR Full Sheet — any registered modifier field, including lab craft time and while-dashing deflection.

Source satellite (coverage): `[../../.docs2/plans-later/equipments-plan.spec.MD](../../.docs2/plans-later/equipments-plan.spec.MD)`.

#### Item rule

Each **equip item** (Special or Generic) defines **zero or more grants**. A grant is `{ field, value, when? }`:

| Part | Rule |
| --- | --- |
| `field` | Must be a key in the **modifier registry** below — always a `*_mod` or `*_mul` suffix — **or** a primary `BaseSumField` (`agility` … `energy`) |
| `value` | Additive for `*_mod` and baseSum; multiplicative factor for `*_mul` (accumulator rules per `D10`) |
| `when` | Optional context. Omitted = **always** (included in every Full Sheet recalc). See contextual table |

Items may also grant raw `baseSum` contributions to primary families (e.g. `agility`, `shield`) as today — those feed `_cur`/`_max` before mods apply.

**No other stat shape on items.** Weapon behaviour, bomb payloads, and dash impulse stay in their Special-slot systems; they **read** published Summary after equip recalc.

#### Modifier registry (exhaustive for equips)

**Primary families** (feed [`char-sheet.spec.MD`](./char-sheet.spec.MD) (Full Sheet families) `_cur` / `_max`):

| Field | Family |
| --- | --- |
| `agility_mod` · `agility_mul` | Agility (AGI) |
| `deflection_mod` · `deflection_mul` | Deflection (DFL) |
| `precision_mod` · `precision_mul` | Precision (PRE) |
| `integrity_mod` · `integrity_mul` | Integrity (INT) |
| `shield_mod` · `shield_mul` | Shield (SHD) |
| `energy_mod` · `energy_mul` | Energy (ENE) |

**Derived combat families** (feed [`char-sheet.spec.MD`](./char-sheet.spec.MD) (Full Sheet families) derived `cur`):

| Field | Feeds |
| --- | --- |
| `speed_mod` · `speed_mul` | Speed → Summary `SPD` |
| `damage_mod` · `damage_mul` | Damage → Summary `S_D` |
| `shot_rate_mod` · `shot_rate_mul` | Shot rate → Summary `S_R` |
| `defense_mod` · `defense_mul` | Defense → Summary `DEF` / `MIT` |

**Craft / Lab family** (Full Sheet only — **not** read per combat frame):

| Field | Feeds |
| --- | --- |
| `lab_craft_time_mod` · `lab_craft_time_mul` | Lab craft duration — lower is faster. Read when a craft **starts** (Pause Lab / CraftSlot), not in the combat loop |

**Examples (design intent, numbers in `BALANCE` later):**

| Item idea | Grants |
| --- | --- |
| Quantum Deflectors | `shield_mod`, `shield_mul` |
| Gravity Assist Engine | `speed_mod`, `speed_mul` |
| Lab Efficiency Module | `lab_craft_time_mul: 0.85` (15% faster crafts) |
| Phase Dash Coil (Dash Special) | `when: dashing` → `deflection_mod`, `deflection_mul` |

#### Contextual grants (`when`)

Transient states merge at **Summary recalc** when the context toggles — they do **not** rewrite stored Full Sheet base equip totals.

| `when` | Active while | Recalc trigger |
| --- | --- | --- |
| *(omit)* | Always equipped | Equip/unequip · `LVL` · relevant Effect |
| `dashing` | `PlayerManager` dash active | **Dash start** → Summary patch; **dash end** → revert |
| `shield_empty` | `shield_cur = 0` | Shield hits 0 / regen above 0 |
| `integrity_severe` | Integrity state SEVERE or DRIFTING | Integrity threshold cross |

Contextual grants use the **same field names** as the registry (e.g. `deflection_mod` while dashing stacks with always-on deflection per `D10`).

Effect-slot timed buffs remain the channel for **temporary** non-equip modifiers (duration/cooldown) — same field names, Summary-only patch (`CHAR-05`).

#### Accumulation (`D10` reminder)

For each field, sum all applicable `*_mod` grants, multiply all applicable `*_mul` grants (contextual included when active), then run family op order from [`char-sheet.spec.MD`](./char-sheet.spec.MD) (Full Sheet families). Equip change → Full Sheet recalc → new Summary including `MIT`.

#### Craft output link

Crafted equips must obey the modifier registry above (`D29`). **Recipes / CraftSlot / inventory** → [`crafting.spec.MD`](./crafting.spec.MD) (`D31`). **World drops** → [`drops.spec.MD`](./drops.spec.MD) (`D32`).

## Requirements (`EQP-` — modifier grants)



| ID       | Prio   | Requirement | Acceptance |
| -------- | ------ | ----------- | ---------- |
| `EQP-01` | must   | Equip items grant only registered `*_mod` / `*_mul` fields; recalc publishes Summary | Equip swap changes `SPD`/`DEF`/… predictably; no orphan stat keys on items |
| `EQP-02` | must   | Contextual grants (`when: dashing`, …) patch Summary on context toggle | Dash item can raise deflection only while dashing; revert on dash end |
| `EQP-03` | should | `lab_craft_time_mod` / `lab_craft_time_mul` on Full Sheet; read at craft start | Equipped lab module reduces craft timer |
