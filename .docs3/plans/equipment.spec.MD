# Ikarus Eternal Horizon — Equipment — Modifier Grants

tag_g_equipment tag_s_equip_mod_mul_grants tag_s_equip_contextual_mods tag_s_equip_lab_craft_mods
RESUME: Equip items grant only registered *_mod / *_mul fields; contextual when-bundles; lab craft time modifiers.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

Satellite: [`../../.docs2/plans-later/equipments-plan.spec.MD`](../../.docs2/plans-later/equipments-plan.spec.MD)

---

## `EQP-01` — Equip items and `*_mod` / `*_mul` grants (`D29`)

tag_g_equipment tag_s_equip_mod_mul_grants tag_s_equip_contextual_mods tag_s_equip_lab_craft_mods
RESUME: Every equip item is data-only grants into the CHAR Full Sheet — any registered modifier field, including lab craft time and while-dashing deflection.

Source satellite (coverage): `[../../.docs2/plans-later/equipments-plan.spec.MD](../../.docs2/plans-later/equipments-plan.spec.MD)`.

#### Item rule

Each **equip item** (Special or Generic) defines **zero or more grants**. A grant is `{ field, value, when? }`:

| Part | Rule |
| --- | --- |
| `field` | Must be a key in the **modifier registry** below — always a `*_mod` or `*_mul` suffix |
| `value` | Additive for `*_mod`; multiplicative factor for `*_mul` (accumulator rules per `D10`) |
| `when` | Optional context. Omitted = **always** (included in every Full Sheet recalc). See contextual table |

Items may also grant raw `baseSum` contributions to primary families (e.g. `+AGI`, `+SHD`) as today — those feed `_cur`/`_max` before mods apply.

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
