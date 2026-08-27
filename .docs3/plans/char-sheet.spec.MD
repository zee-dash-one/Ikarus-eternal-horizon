# Ikarus Eternal Horizon — CHAR — Craft Sheet

tag_g_char_sheet tag_g_combat
RESUME: Every craft — 54 slots, Full/Summary publish, integrity states, recalc triggers, damage path with precomputed MIT.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

Applies to **player and enemies**.

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
| Defense   | `(defense_cur + defense_mod) x defense_mul`                                      |


Effect slots are the channel for temporary Shot Rate / Defense modifiers (`D11`).

## `CHAR-03` — Summary Sheet

tag_s_char_summary_sheet tag_s_char_mitigation_mit

Published fields = [`nomenclature.spec.MD`](./nomenclature.spec.MD) (Summary Sheet codes). **No system edits Summary directly** — only recalc (`CHAR-05`).

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

