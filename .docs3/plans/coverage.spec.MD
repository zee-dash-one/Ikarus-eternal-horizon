# Ikarus Eternal Horizon — Docs2 Coverage Checklist

tag_g_docs tag_s_docs_coverage_matrix
RESUME: Docs2 prefix/stage coverage matrix — what docs3 owns vs defers; naming deltas vs docs2/GDD.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.16

---

## Deferred requirement prefixes (named for coverage; not detailed here)

`LORE-` · remaining `RUL-` (`RUL-06` / `RUL-09` difficulty · `RUL-11` score multipliers · `RUL-14` settings persist) — checklist rows only. `WPN-` · `RUL-02` · `CAM-` · `MET-` · `HUD-` now have theme specs.


## Docs2 coverage checklist

Legend: **Covered** = owned by a docs3 ID above · **Deferred** = acknowledged, not designed in this revision · **N/A** = docs2-only construction concern (POC2 cards / port map / DoD agents) outside this design hub’s scope.

### 8.1 Docs2 requirement prefixes


| Docs2 prefix                       | Docs3 status           | Notes                                                           |
| ---------------------------------- | ---------------------- | --------------------------------------------------------------- |
| `SHIP-01` motion                   | Deferred               | Needs CTRL/META when a code target exists; sheet supplies `SPD` |
| `SHIP-02` destruction              | **Covered**            | `CHAR-04` (DRIFTING→DEAD replaces instant Integrity 0 kill)     |
| `SHIP-03` laser fire               | **Covered**            | `WPN-01`/`WPN-05` [`weapons.spec.MD`](./weapons.spec.MD) · Summary `S_D`/`S_R`/`ENE` |
| `SHIP-04` pointer / schemes        | **Covered**            | `CTRL-01` · [`input.spec.MD`](./input.spec.MD) (Mix scheme; no pointer-steer)                 |
| `SHIP-05` shield first             | **Covered**            | `CHAR-06`                                                       |
| `SHIP-06` inventory scrap          | **Partial**            | Caps [`crafting.spec.MD`](./crafting.spec.MD) · spawn [`drops.spec.MD`](./drops.spec.MD) |
| `SHIP-07` craft repair             | **Partial**            | Repair recipe · `EQP-04` [`crafting.spec.MD`](./crafting.spec.MD) |
| `SHIP-08` jet reserve              | Deferred               | Dash Special slot reserved; economy later                       |
| `SHIP-09` energy economy           | **Covered** (sheet)    | `ENE`/`REG` on Summary; full economy Deferred                   |
| `SHIP-10` equipment effects        | **Covered**            | `CHAR-01`–`CHAR-05` · `EQP-01` modifier grants                  |
| `SHIP-11` tech tree                | Deferred               |                                                                 |
| `SHIP-12` hull penalties           | **Covered**            | `CHAR-04` states (replaces 1/2/3 level table)                   |
| `SHIP-13` persistent remap         | Deferred               |                                                                 |
| `WPN-01..08`                       | **Partial**            | [`weapons.spec.MD`](./weapons.spec.MD) · Theme 5 = `WPN-01`/`02`/`05` · Theme 11 = `WPN-03`/`04`/`06` · `WPN-08` defer |
| `ENM-01` spawn enemy               | **Covered** (identity) | `ENEMY-01`–`03`; spawn managers Deferred                        |
| `ENM-02` pooling                   | Deferred               | memory/runtime                                                  |
| `ENM-03` distinct behaviours       | **Covered**            | `ENEMY-02` + `SQUAD-`*                                          |
| `ENM-04` asteroids                 | **Covered**            | `MET-01`–`04` [`meteors.spec.MD`](./meteors.spec.MD)            |
| `ENM-05` MiniBoss telegraph        | Deferred               |                                                                 |
| `ENM-06` trio silhouette           | **Covered**            | `ENEMY-03` (Tanker name)                                        |
| `ENM-07` Mega Asteroid             | Deferred               |                                                                 |
| `ENM-08` Boss General              | Deferred               | Special class seam                                              |
| `ENM-09` post-500 patterns         | Deferred               |                                                                 |
| `RES-01..06`                       | **Partial**            | Drop path [`drops.spec.MD`](./drops.spec.MD) · caps [`crafting.spec.MD`](./crafting.spec.MD) |
| `STR-`                     | **Partial**            | [`store.spec.MD`](./store.spec.MD) · shop/streak `STR-01`–`09` · adapters `STR-10`–`12` · `D36` |
| `BLD-`                     | **Partial**            | [`builds.spec.MD`](./builds.spec.MD) · four outputs `BLD-01`–`06` · Steam upload `BLD-07` defer · `D37` |
| `RUL-01` game loop                 | **Covered**            | `ARCH-17` [`architecture.spec.MD`](./architecture.spec.MD)      |
| `RUL-02` bounds/despawn            | **Covered**            | [`world.spec.MD`](./world.spec.MD)                              |
| `RUL-03` score / game over         | **Partial**            | Player DEAD → Result (`Q04`) · `HUD-02` · `SCENE-04` · `RNK-01` |
| `RUL-04` pause                     | **Covered**            | `SCENE-05` ([`scenes.spec.MD`](./scenes.spec.MD)) — **not** asteroids |
| `RUL-05` CraftSlot                 | **Partial**            | `EQP-04` [`crafting.spec.MD`](./crafting.spec.MD)                |
| `RUL-06` / `RUL-09` difficulty     | Deferred               |                                                                 |
| `RUL-07` local best                | **Partial**            | `RNK-01` Local adapter · full boards `RNK-02`–`05`              |
| `RUL-08` Itch package              | **Partial**            | `BLD-06`/`BLD-09` [`builds.spec.MD`](./builds.spec.MD)           |
| `RUL-10` hull levels               | **Covered**            | via `CHAR-04`                                                   |
| `RUL-11` score multipliers         | Deferred               |                                                                 |
| `RUL-12` single balancer           | Deferred               | numbers still must not live in prose forever                    |
| `RUL-13` worst-case perf           | **Covered** (rule)     | `D07` Summary-only frame reads                                  |
| `RUL-14` settings persistence      | Deferred               |                                                                 |
| `EQP-`                     | **Partial**            | Grants `EQP-01`–`03` [`equipment.spec.MD`](./equipment.spec.MD) · craft `EQP-04`–`06` [`crafting.spec.MD`](./crafting.spec.MD) |
| `RNK-`                     | **Partial**            | [`rankings.spec.MD`](./rankings.spec.MD) · Local/Itch/Poki `RNK-01`–`05`/`10`–`12` · Steam defer · `D30` |
| `LORE-`                    | Deferred               | Theme 14 — no design spec this pass                             |
| `META-` (HUD)              | **Covered**            | `HUD-01`–`04` [`hud.spec.MD`](./hud.spec.MD)                    |
| `ACH-`                     | **Partial**            | [`achievements.spec.MD`](./achievements.spec.MD) + [`achievements.spec.MD`](./achievements.spec.MD) · Local + Itch/Poki/Steam adapters (`D28`)         |


### 8.2 Docs2 Stage cards (A–G) — design coverage only


| Docs2 cards                         | Docs3 status               | Notes                                                                                             |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| A01–A05 core/pools                  | N/A → Deferred             | Implementation concern · **A02 input** → **Covered** as `CTRL-01` / `InputManager` ([`input.spec.MD`](./input.spec.MD))        |
| B01–B04 camera/world                | **Covered**                | `CAM-01`–`05` · `RUL-02` [`world.spec.MD`](./world.spec.MD)                                   |
| C01 Ship / C03 ShipHealth           | **Covered** (replaced)     | by `CHAR-`*                                                                                       |
| C02 Controller                      | **Covered** (renamed)      | → `PlayerManager` reads virtual pad (`D22`, `D27`)                                                |
| D01–D06 weapons                     | **Partial**                | `WPN-*` [`weapons.spec.MD`](./weapons.spec.MD) — Theme 5 Laser; Theme 11 full catalog           |
| E01 Enemy                           | **Covered** (replaced)     | `ENEMY-`*                                                                                         |
| E02–E04 / E06 meteor & shots        | **Partial**                | `MET-*` [`meteors.spec.MD`](./meteors.spec.MD) · `WPN-01` ShotManager                            |
| E05 EnemyManager + squad follow-ons | **Covered** (squad design) | `SQUAD-`*; spawn cadence Deferred                                                                 |
| E07 FiringManager                   | **Partial**                | [`weapons.spec.MD`](./weapons.spec.MD) · [`input.spec.MD`](./input.spec.MD) `A`/`B`/`X`/`Y`     |
| F01 layers                          | **Covered** (design set)   | `D14`                                                                                             |
| F02–F05 drops/diff/damage/vfx       | **Partial** (F02)      | `DropManager` [`drops.spec.MD`](./drops.spec.MD); F03–F05 Deferred |
| G01–G12 scenes/UI                   | **Partial**                | HTML **Login** (`D41`/`AUTH-*`) · canvas Start · **Pause** (`SCENE-01`/`02`/`05`); combat HUD `HUD-*`; Touch/nipple via `CTRL-01`; Title/Run/Result `SCENE-03`/`04` |
| §6.3 multi-agent SDD / DoD          | N/A                        | returns when a code target + specs exist                                                          |
| §5.0 POC-1 port map                 | N/A                        | docs3 is not a port                                                                               |


### 8.3 Naming deltas vs docs2 / GDD


| Docs2 / GDD                               | Docs3                                       |
| ----------------------------------------- | ------------------------------------------- |
| Tank                                      | **Tanker**                                  |
| Integrity 0 = run over                    | **DRIFTING** then **DEAD** on next hit      |
| Modular airplane modules as runtime stats | Full Sheet → **Summary Sheet** publish      |
| Byte pools 0–255 as live combat truth     | Summary codes (`ENE`/`SHD`/…) as live truth |
| Factory/class POC2 architecture           | Out of scope (design hub)                   |
| `*Controller` / `*Resolver` system names  | `*Manager` **only** (`D22`, [`nomenclature.spec.MD`](./nomenclature.spec.MD) (*Manager table))           |
| docs2 `InputAction` (`fire`, `bomb`, …)   | Virtual pad tokens (`A`, `B`, `X`, `Y`, `R1`, `Start`, …) · `D27` |
| docs2 single Steam bridge                 | Local + Itch + Poki + Steam **publish adapters** · `D28` · `D30`  |

