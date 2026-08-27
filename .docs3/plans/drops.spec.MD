# Ikarus Eternal Horizon — Drops & Collection

tag_g_drops tag_s_drops_manager tag_s_drops_loot_table
RESUME: DropManager — loot tables on kill, pooled Drop fragments, magnet pull, collect into run inventory; layer Drop; zero alloc on hot path.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.2

Satellites: [`../../.docs2/plans-later/resources-plan.spec.MD`](../../.docs2/plans-later/resources-plan.spec.MD) · docs2 `SDD-F02` coverage.

**Related:** [`crafting.spec.MD`](./crafting.spec.MD) (inventory caps · CraftSlot) · [`char-sheet.spec.MD`](./char-sheet.spec.MD) (`Collector` Special) · [`nomenclature.spec.MD`](./nomenclature.spec.MD) (`DropManager`)

---

## Ownership (`D32`)

tag_g_drops tag_s_drops_manager
RESUME: DropManager is the sole owner of world-space loot fragments — spawn, magnet, pool, collect handoff.

| Owns | Does **not** own |
| --- | --- |
| Loot tables per kill source (`BALANCE.drops.tables`) | Recipe catalog / CraftSlot ([`crafting.spec.MD`](./crafting.spec.MD)) |
| Pooled `Drop` fragment entities | Inventory storage internals (`InventoryPort` / run bag) |
| Magnet pull toward player | HUD counter rendering (reads inventory) |
| Collect → `inventory.tryAdd` | Score, damage, enemy/meteor geometry |
| Layer `Drop` registration with `CollisionManager` | Equip grant math (`EQP-*`) |

**Trigger:** any destroy that yields loot calls `DropManager.onSourceKilled` / `onMeteorDestroyed` — never spawn fragments from `EnemyManager` / `MeteorManager` directly.

---

## Resource payload ids

tag_g_resources tag_s_resources_material_types
RESUME: Fragment payload ids match crafting material catalog — stacks vs epic item instance.

| `ResourceId` | Display | Stack? | First ship |
| --- | --- | --- | --- |
| `metalScrap` | Metal Scrap | yes | Theme 7 |
| `prismaticCrystal` | Prismatic Crystal | yes | Theme 12 |
| `denseCore` | Dense Core | yes | Theme 12 |
| `darkMatter` | Dark Matter | yes | Theme 12+ |
| `equipment` | Equipment (ready item) | **no** — item ref | Theme 12 |

Canonical names and GDD aliases: [`crafting.spec.MD`](./crafting.spec.MD) (material types). This file owns **how** they appear in the world.

---

## Loot tables by source

tag_g_drops tag_s_drops_loot_table tag_s_resources_drop_table
RESUME: Per-source weighted grants — chance · min · max; numbers in BALANCE only.

| Source (`DropSource`) | Expected yields (design) |
| --- | --- |
| `meteor` S / M | Metal Scrap (high / always) |
| `meteor` L | Metal Scrap + Prismatic Crystal (chance) |
| `enemy` | Metal Scrap (chance) · Prismatic Crystal (later) |
| `miniBoss` | Prismatic Crystal · Dense Core · Equipment (chance) |
| `megaAsteroid` | High Metal Scrap volume · Dense Core (chance) |
| `boss` | Dense Core · Dark Matter · Equipment |

```typescript
// BALANCE.drops.tables[*] entry shape (sketch)
interface DropTableEntry {
  readonly id: ResourceId;
  readonly chance: number; // 0..1 per roll
  readonly min: number;
  readonly max: number;
}
```

| Rule | Detail |
| --- | --- |
| Roll | `onSourceKilled` / `onMeteorDestroyed` → `rollTable` → N grants |
| Pool full | Skip spawn for that grant — do **not** alloc (`RES-03`) |
| G1 stub | Enemy Metal Scrap chance stub; meteor Scrap chance ~1.0; other ids present with chance `0` until Theme 12 |
| Numbers | Only in `BALANCE.drops` (`Q15`) — not in this prose |

---

## Fragment lifecycle & pool

tag_g_drops tag_s_drops_fragment_pool tag_s_resources_fragment_pool tag_s_engine_object_pool
RESUME: Drop extends THREE.Mesh — activate/deactivate from ObjectPool; off-field recycle; Mega waves stay bounded.

| Field / step | Rule |
| --- | --- |
| `Drop.layer` | Collision layer **`Drop`** (`D14`) |
| `activate(spawn)` | Set `id`, `amount`, `x`/`z`, `active` |
| `update(dt)` | Magnet pull or idle drift; no `new Vector3` |
| `syncRender()` | Position / opacity / visible only |
| `deactivate` | Return to pool |
| Off-field | Outside despawn box → recycle ([`world.spec.MD`](./world.spec.MD) `RUL-02`) |
| `liveCount` | Always ≤ `BALANCE.drops.poolSize` |

---

## Magnet & collect

tag_g_drops tag_s_drops_magnet_pull tag_s_resources_magnet_collect
RESUME: Courtesy magnet radius toward player; collect via proximity or Player→Drop collision pair.

| Rule | Detail |
| --- | --- |
| Magnet target | Player craft position (`MagnetTargetPort` — `x`/`z`) |
| Radius | `BALANCE.drops.magnetRadius` — pull when `distXZ ≤ radius` |
| Speed | `BALANCE.drops.magnetSpeed` — slide in, never teleport |
| Collect | Distance ≤ `drop.radius + shipRadius` **or** `CollisionManager` Player→Drop pair |
| Inventory | `inventory.tryAdd(id, amount)` — returns accepted count |
| Accepted > 0 | Release fragment to pool; SFX pitch by type + UI tick |
| Accepted = 0 | Fragment **stays** on field (cap full — `RES-05`) |
| Collector slot | Future: equip may raise magnet radius via Summary / BALANCE — not per-frame Full Sheet math |

**Feel (design):** magnet is a courtesy, not a screen-wide vacuum. Cap-full gems sitting on the field are correct — vanishing loot is not.

---

## `DropManager` contract (sketch)

tag_s_drops_manager

```
onSourceKilled(source, x, z)
onMeteorDestroyed({ x, z, size: S|M|L })
collect(drop)
update(dt)
syncRender()
liveCount()
dispose()
```

Dependencies (ports only): `ObjectPool<Drop>` · `InventoryPort` · `MagnetTargetPort` · collider register/unregister.

Gameplay callers never import fragment meshes or loot RNG outside `DropManager`.

---

## Collision

tag_g_combat tag_s_combat_collision_layers
RESUME: Layer Drop participates in Player→Drop collect pairs — no damage from drops.

| Pair | Effect |
| --- | --- |
| Player → Drop | Collect path (same as proximity collect) |
| PlayerShot / EnemyShot → Drop | **No** hit (matrix false) |
| Drop → Drop | No |

---

## Feedback & legibility

tag_g_audio tag_s_audio_cue_dispatch
RESUME: Dual feedback on collect — typed SFX + inventory UI tick; colour-coded fragment meshes.

| Channel | Rule |
| --- | --- |
| Mesh colour | Per `ResourceId` in `BALANCE.drops.colors` — readable <0.3s |
| SFX | Pitch / cue id scales by resource type (`SoundManager`) |
| UI | Inventory / HUD tick on accepted collect |
| Size | Tiny chips — not enemy-scale boxes |

---

## Requirements (`RES-` — drop path)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `RES-01` | must | Metal Scrap drops from asteroids and enemies | Fragments spawn on destruction |
| `RES-02` | must | Magnet collection + feedback | Approaching pulls; SFX + UI confirm |
| `RES-03` | must | Fragment pool / recycle | Long session does not grow unbounded heap |
| `RES-04` | should | Full five-type loot table by source | Each source respects drop table |
| `RES-06` | defer | Equipment as epic ready item drop | Loot enters inventory as item ref |

Inventory **caps** (`RES-05`) → [`crafting.spec.MD`](./crafting.spec.MD) (store side). Collect still respects `tryAdd` returning 0.

---

## BALANCE keys (feel stubs — Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `magnetRadius` | Courtesy pull distance |
| `magnetSpeed` | Snap-in without teleport |
| `metalScrapChance` | Enemy table Scrap roll |
| `fragmentRadius` | Collect hit size |
| `poolSize` | Hard live-fragment ceiling |
| `despawn` | Off-field recycle box |
| `tables.*` | Per-source `DropTableEntry[]` |
| `colors.*` | Mesh tint per `ResourceId` |

---

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q15 | Numeric drop rates per source | stubs in `BALANCE.drops.tables` |
| Q19 | Meteor fragmentation geometry vs loot spawn split | MeteorManager signals destroy; DropManager rolls loot |
| R04 | Equipment loot table weights | defer · Theme 12 |
