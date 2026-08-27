# Ikarus Eternal Horizon — ENEMY — Individual Craft

tag_g_enemy
RESUME: Enemy Base fields, five-state strategy SM, Tanker/Warrior/Rogue classes and formation roles.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

Source: [`../consider/enemy_sheet.MD`](../consider/enemy_sheet.MD)

---

Source: `[../consider/enemy_sheet.MD](../consider/enemy_sheet.MD)`. Every enemy has a CHAR sheet **and** an Enemy Base SM.

## `ENEMY-01` — Enemy Base


| Field      | Definition                                               |
| ---------- | -------------------------------------------------------- |
| `Id`       | Stable unique id                                         |
| `Strategy` | `EnterGate` · `FindGroup` · `LoopBack` · `Flee` · `Fury` |
| `Ticks`    | Countdown to next chance roll for a strategy transition  |


## `ENEMY-02` — Individual strategies (`D16`)

tag_s_enemy_strategy_sm


| State       | Behaviour                                                       |
| ----------- | --------------------------------------------------------------- |
| `EnterGate` | Fast flight through the combat-zone gate                        |
| `FindGroup` | Sinusoidal return seeking a squad slot                          |
| `LoopBack`  | Circular path ending near the start pose                        |
| `Flee`      | Leave the battle area; may rejoin during squad `PatrolGrouping` |
| `Fury`      | Lock player position and dive until off-field                   |


- Each `Ticks` interval: roll chance to transition.
- `OnBreakGroup` (squad): each member may `Flee` or join a `LineDivers` dive with same class.
- Individual `Fury` may run while the squad is still in a patrol state.

## `ENEMY-03` — Classes (`D15`, `D18`)


| Class   | Formation use                            | CHAR bias (stub)       |
| ------- | ---------------------------------------- | ---------------------- |
| Tanker  | Front (`CircleII`) · Center (`CircleIV`) | high INT/SHD           |
| Warrior | Inner circle                             | balanced S_D / S_R     |
| Rogue   | Outer circle                             | high AGI/SPD           |
| Special | Not in mixed recipes                     | unique sheets / bosses |


Base game ships the trio. Silhouette must read in <0.3s; race skins do not change class shape.


## Requirements (`ENEMY-`)



| ID         | Prio | Requirement                            | Acceptance                                        |
| ---------- | ---- | -------------------------------------- | ------------------------------------------------- |
| `ENEMY-01` | must | Enemy Base (`Id`, `Strategy`, `Ticks`) | Every enemy exposes the trio                      |
| `ENEMY-02` | must | Five-state individual SM               | Ticks + chance drive transitions; Flee can rejoin |
| `ENEMY-03` | must | Tanker / Warrior / Rogue (+ Special)   | Formations resolve class roles; silhouette <0.3s  |

