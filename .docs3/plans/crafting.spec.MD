# Ikarus Eternal Horizon — Crafting & Resources

> **Runtime F (2026-10-21):** the playable per-run catalog is integrated and tested; [consolidation.spec.MD](./consolidation.spec.MD) records the shipped profiles, bounded pools, recipes, equipment and Survivor restrictions. Older theme/defer notes below describe the original milestones; unshipped GDD catalog entries remain future content.


tag_g_resources tag_g_crafting tag_s_resources_material_types tag_s_crafting_craft_slot
RESUME: Run material economy — inventory caps, Pause-only real-time CraftSlot, recipes consuming materials + Energy + time. World drops → [`drops.spec.MD`](./drops.spec.MD).

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.2

Satellites: [`../../.docs2/plans-later/resources-plan.spec.MD`](../../.docs2/plans-later/resources-plan.spec.MD) · [`../../.docs2/plans-later/equipments-plan.spec.MD`](../../.docs2/plans-later/equipments-plan.spec.MD)

**Related:** [`drops.spec.MD`](./drops.spec.MD) (`DropManager` · loot · magnet) · [`equipment.spec.MD`](./equipment.spec.MD) (equip grants) · [`char-sheet.spec.MD`](./char-sheet.spec.MD) (`Lab` Special) · [`scenes.spec.MD`](./scenes.spec.MD) (Pause Lab UI)

---

## Pipeline (locked)

tag_g_crafting tag_s_crafting_recipe_schema tag_s_crafting_energy_cost
RESUME: Collect handoff → run inventory → Pause Lab craft → equip/consumable/repair output; one CraftSlot.

```text
Destroy source ──► DropManager (see drops.spec.MD) ──► inventory.tryAdd
                                                              │
Pause overlay (Run frozen) ◄──────────────────────────────────┘
  Lab tab → pick recipe → pay materials + ENE → real-time timer (lab_craft_time_*)
       │
       └─► output: equip item · ordnance charge · repair/shield service
```

| Stage | Owner | Rule |
| --- | --- | --- |
| Spawn / magnet / pool | `DropManager` | [`drops.spec.MD`](./drops.spec.MD) · `D32` |
| Store | Run inventory | Per-resource caps; overflow not collected (`RES-05`) |
| Craft | `CraftManager` | **Pause only** · **one** active job · real-time duration |
| Output | `CraftManager` | Equip → Generic/Special slot · ordnance → Bomb slot charges · repair → Integrity |

Gameplay never crafts during live combat (`D31`). Survivor v1: **craft off** — no Lab recipes, no repair path (`Q11`, [`rankings.spec.MD`](./rankings.spec.MD)).

---

## Material types (`RES-`)

tag_g_resources tag_s_resources_material_types
RESUME: Five canonical run resources — rarity tiers, primary uses, legacy GDD aliases.

| Resource | Rarity | Primary use | First ship (theme) |
| --- | --- | --- | --- |
| **Metal Scrap** | Common | Integrity repair; basic crafts | Theme 7–12 |
| **Prismatic Crystal** | Uncommon | Weapon/tech projects; shield recharge | Theme 12 |
| **Dense Core** | Rare | Advanced upgrades; high ordnance | Theme 12 |
| **Dark Matter** | Special | Top-tier recipes | Theme 12+ |
| **Equipment** | Epic | Pre-built item (equip, weapon module, or bomb) — inventory, not a stack | Theme 12 |

### Legacy GDD aliases (do not use in new copy)

| GDD v1 | Canonical |
| --- | --- |
| Structural Alloy | **Metal Scrap** |
| Energy Core | **Dense Core** |
| Tactical Component | **Prismatic Crystal** / **Dense Core** (per recipe) |

World spawn / magnet / pool → [`drops.spec.MD`](./drops.spec.MD).

---

## Run inventory

tag_g_resources tag_s_resources_inventory_caps
RESUME: Per-resource stacks for the current run only — caps, no meta persistence on boards.

| Rule | Detail |
| --- | --- |
| Scope | **Current run only** — no cross-run material hoarding on leaderboards |
| Caps | Per-type max in `BALANCE.inventory` / `BALANCE.drops.stockCaps`; Engineering may raise (`Q16`) |
| Overflow | At cap: `tryAdd` returns 0 — fragment stays in world ([`drops.spec.MD`](./drops.spec.MD)) |
| Decay | **Off by default** — only if playtest shows passive hoarding without risk |
| Equipment drop | Epic **item instance** → inventory list, not a numeric stack (`RES-06`) |

Pause **Use / Drop** on inventory items ([`scenes.spec.MD`](./scenes.spec.MD)) — materials are stack counts; Equipment entries are item refs.

---

## CraftSlot & `CraftManager` (`D31`)

tag_g_crafting tag_s_crafting_craft_slot tag_s_run_lab_craft
RESUME: One real-time craft job bound to Lab Special slot; chosen and monitored from Pause Lab tab.

| Rule | Detail |
| --- | --- |
| When | Player opens Pause → **Lab** tab → selects recipe |
| Slot | **One** CraftSlot globally — second craft blocked (`EQP-04`) |
| Timer | Real-time seconds × `lab_craft_time_mod/mul` from equipped Lab module ([`equipment.spec.MD`](./equipment.spec.MD)) |
| Sim time | Craft timer **advances while Pause is open**; Run world frozen (`D21`) |
| Energy | Up-front `ENE` cost from Summary; craft blocked if `EnergyManager.canAfford` fails |
| Materials | Consumed at **craft start** (locked this pass) |
| Output | On complete: apply repair / grant item / add ordnance charges |
| Cancel | Policy open (`Q18`) — default: no refund this pass |

`CraftManager` owns slot state, recipe validation, timer, and completion callbacks. UI lives in Pause overlay; Run loop calls `CraftManager.update(dt)` only when Pause allows meta time (same gate as craft timer).

---

## Recipe schema

tag_g_crafting tag_s_crafting_recipe_schema tag_s_crafting_energy_cost
RESUME: Data-only recipes in BALANCE — materials + energy + time → typed output.

```typescript
// BALANCE shape (sketch — not production code)
interface CraftRecipe {
  id: string;
  category: 'repair' | 'shield' | 'equip' | 'ordnance' | 'weapon_upgrade' | 'refine_material';
  materials: Partial<Record<'metal_scrap' | 'prismatic_crystal' | 'dense_core' | 'dark_matter', number>>;
  energyCost: number;
  baseTimeSec: number;
  output: { kind: 'integrity' | 'shield' | 'equipId' | 'ordnanceId' | 'weaponUpgradeId' | 'materialId'; amount?: number };
  gate?: 'g1' | 'g2'; // milestone / kill band — numbers in BALANCE
}
```

**Tension (locked intent):** same Summary **`ENE`** pool feeds movement, weapons, dash, and craft. Crafting during a heavy wave must hurt.

### Recipe catalog (design — numbers in `BALANCE`)

| Output | Materials | Energy | Time (base) | Gate |
| --- | --- | --- | --- | --- |
| Integrity repair | Metal Scrap | low | short | G1 |
| Shield recharge | Metal Scrap + Prismatic Crystal | medium | short | G2 |
| Reactive Panels | Metal Scrap + Prismatic Crystal | medium | medium | G2 |
| Nuclear Reversor | Prismatic Crystal + Dense Core | medium | medium | G2 |
| Gravity Assist Engine | Metal Scrap + Dense Core | medium | medium | G2 |
| Quantum Deflectors | Prismatic Crystal + Dense Core | high | long | G2 |
| Weapon upgrades (Cannons / Emitter / Storm) | Prismatic Crystal + Dense Core | high | long | G2 |
| Nova Bomb / Wasp Cluster | Metal Scrap + Prismatic Crystal | medium | short | G2 |
| Singularity Bomb | Dense Core + Dark Matter | high | long | G2 |

Crafted **equip** items must still obey [`equipment.spec.MD`](./equipment.spec.MD) — only registered `*_mod`/`*_mul` grants (`D29`). Display names above map to equip ids in `BALANCE`.

### Energy sources (equip interaction)

```text
Materials ──► [Nuclear Reversor equip] ──► ENE ──┐
Space     ──► [Reactive Panels equip]  ──► ENE ──┤
                                                 ├──► weapons · dash · craft recipes
```

Regen/equip details stay in `EnergyManager` + equip grants — not recomputed per frame on Full Sheet.

---

## Requirements

### Inventory (`RES-05`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `RES-05` | should | Per-resource inventory caps | At cap, excess not collected (`tryAdd` → 0) |

Drop spawn / magnet / pool / loot tables → [`drops.spec.MD`](./drops.spec.MD) (`RES-01`–`04`, `RES-06`).

### Craft (`EQP-04`–`EQP-06`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `EQP-04` | must | Exclusive real-time CraftSlot | Second craft blocked while timer active |
| `EQP-05` | should | Recipe catalog per schema above | Repair + at least one G2 equip craft playable |
| `EQP-06` | defer | Cancel policy documented in `BALANCE` | Cancel button behavior matches chosen rule |

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q16 | Inventory cap values + Engineering expansion | flat caps until skill tree |
| Q17 | Overflow convert vs discard | discard (`RES-05`) |
| Q18 | Craft cancel refund | no refund v1 |
| R03 | Exact Dark Matter recipes beyond Singularity | defer |
