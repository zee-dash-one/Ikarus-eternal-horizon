# Ikarus Eternal Horizon — Meteors (Environmental Pressure)

> **D49 scheduling:** separate asteroid spawn-point registry and deterministic sprint-time sequence, planned before Run starts. MeteorManager consumes these events, independently of enemy clearance; no competing random timer. First batch is staged inactive before entry; pause freezes clocks. See [run-flow.spec.MD](./run-flow.spec.MD) for extension, pool exhaustion and sprint handoff.


tag_g_environment tag_s_env_meteor_pool tag_s_env_meteor_spawn
RESUME: MeteorManager — pooled S/M/L asteroids, spawn/drift/despawn, DamageManager hits, optional large split.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.16

**Related:** [`world.spec.MD`](./world.spec.MD) (`RUL-02` despawn) · [`char-sheet.spec.MD`](./char-sheet.spec.MD) (`CHAR-06` · layer `Meteor`) · [`drops.spec.MD`](./drops.spec.MD) (`onMeteorDestroyed`) · [`weapons.spec.MD`](./weapons.spec.MD) (`WPN-02`)

Coverage: docs2 `ENM-04` (asteroids) · `ENM-07` Mega Asteroid **deferred**. Docs2 `RUL-04` is **pause** (`SCENE-05`), not asteroids.

---

## Ownership

tag_g_environment tag_s_env_meteor_spawn
RESUME: MeteorManager is the sole owner of world-space meteor entities — spawn, drift, pool, destroy signal.

| Owns | Does **not** own |
| --- | --- |
| Pooled meteor entities · sizes `S`/`M`/`L` | Loot rolls ([`drops.spec.MD`](./drops.spec.MD)) |
| Spawn volumes / drift / `RUL-02` despawn | Sprint planning/cadence (`SprintPlanManager`, D49) |
| Destroy → `DropManager.onMeteorDestroyed` | VFX mesh pool (`VfxManager` — Theme 13) |
| Layer `Meteor` registration | Player/enemy AI |

**Trigger:** `MeteorManager` never spawns drops itself. On destroy it signals `DropManager` only (`D32`).

---

## Sizes & pool (`MET-01`)

tag_g_environment tag_s_env_meteor_pool tag_g_engine tag_s_engine_object_pool
RESUME: Three size classes, one ObjectPool; layer Meteor; liveCount capped.

| Size | Role (design) |
| --- | --- |
| `S` | Fast chips — Metal Scrap almost always |
| `M` | Lane blockers — Scrap always |
| `L` | Slow hulks — Scrap + Crystal chance; **may** split (`MET-04`) |

| Rule | Detail |
| --- | --- |
| Layer | `Meteor` (`D14`) |
| Pool | `liveCount ≤ BALANCE.meteors.poolSize` — acquire fail → skip spawn (no alloc) |
| Sim | `{ x, y, vx, vy, size, hp, active }` — no THREE in Core |
| View | `syncRender` pose / scale / material only |

Mega Asteroid (`ENM-07`) is **not** a fourth size in v1 of this spec — Theme 12+ milestone.

---

## Spawn / drift / despawn (`MET-02`)

tag_g_environment tag_s_env_meteor_spawn tag_g_world tag_s_world_playfield_bounds
RESUME: MeteorManager drives lanes; off-field recycle uses RUL-02 box.

| Rule | Detail |
| --- | --- |
| Spawn | Volumes in `BALANCE.meteors.spawn` (left / right / front — same idea as enemy gates, **no** Enemy Base SM) |
| Drift | Constant velocity on gameplay X/Y; no Full Sheet reads |
| Despawn | Outside [`world.spec.MD`](./world.spec.MD) `RUL-02` box → release to pool **without** loot |
| Pause | Drift does not advance while Core ticks are gated (`D21`) |
| Mix | Meteors share the field with enemies; collision matrix decides pairs |

---

## Damage (`MET-03`)

tag_g_environment tag_s_env_meteor_damage tag_g_combat tag_s_combat_damage_apply
RESUME: Shots and contact go through DamageManager; meteor HP in BALANCE by size.

| Pair | Effect |
| --- | --- |
| `PlayerShot` → `Meteor` | `applyDamage` on meteor; destroy at HP 0 → `onMeteorDestroyed` |
| `Meteor` → `Player` | Contact: `applyDamage` on player (incoming from `BALANCE.meteors.contact[size]`) |
| `Meteor` → `Enemy` | Matrix data — default **false** v1 (`Q46`) |
| `EnemyShot` → `Meteor` | Matrix data — default **false** v1 |

Meteor has **no** CHAR sheet. HP is a pool field, not Summary `HP`. Player still uses `CHAR-06` (MIT → SHD → INT).

---

## Split (`MET-04`)

tag_g_environment tag_s_env_meteor_split
RESUME: Optional — destroying L may spawn smaller pooled children; skip if pool exhausted.

| Rule | Detail |
| --- | --- |
| Who | Size `L` only (v1) |
| What | N children of size `M` or `S` from `BALANCE.meteors.split` |
| Pool | If acquire fails, skip that child — **never** alloc |
| Loot | Parent still signals `onMeteorDestroyed` once; children are new entities |

---

## Destruction VFX (`MET-05`)

tag_g_environment
RESUME: Pooled burst on destroy — View only; Theme 13 juice; not required to close Theme 6.

Should-priority. Theme 6 may stub (no burst). Theme 13 wires `VfxManager`.

---

## `MeteorManager` contract (sketch)

```
updateSim(tick)           // spawn cadence, drift, RUL-02 despawn
onShotHit(meteorId, dmg)  // or CollisionManager → apply via DamageManager then here
onContactPlayer(meteorId)
notifyDestroyed(meteor)   // DropManager.onMeteorDestroyed({ x, y, size })
liveCount()
syncRender()
dispose()
```

Gameplay callers never spawn meteor meshes outside `MeteorManager`.

---

## Requirements (`MET-`)

| ID | Prio | Theme | Requirement | Acceptance |
| --- | --- | --- | --- | --- |
| `MET-01` | must | 6 | Pooled meteors `S`/`M`/`L`; layer `Meteor` | Population recycles; pool exhaustion skips spawn |
| `MET-02` | must | 6 | Spawn / drift / despawn via `MeteorManager` + `RUL-02` | Off-field does not leak live meteors |
| `MET-03` | must | 6 | Shot + contact damage through `DamageManager` | Bolts chip HP; contact hurts the craft via `CHAR-06` |
| `MET-04` | should | 6 | Optional split on `L` destroy | Children come from pool or are skipped; no alloc |
| `MET-05` | should | 13 | Pooled destruction VFX | Burst without GC spike (Theme 13) |

---

## BALANCE keys (feel stubs — Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `meteors.poolSize` | Hard live ceiling |
| `meteors.hp.S/M/L` | Hits to destroy |
| `meteors.contact.S/M/L` | Incoming on player contact |
| `meteors.spawn.*` | Volumes + cadence |
| `meteors.split.count` / `childSize` | `MET-04` recipe |
| `meteors.driftSpeed.*` | Lane feel |

---

## Open questions

| # | Question | Default until tuned |
| --- | --- | --- |
| Q46 | Meteor × Enemy collision | **Off** v1 |
| Q19 | Fragment geometry vs loot split | MeteorManager signals destroy; DropManager rolls loot (already [`drops.spec.MD`](./drops.spec.MD)) |
