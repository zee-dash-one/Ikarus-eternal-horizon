# Ikarus Eternal Horizon — SQUAD — Coordinated Group

tag_g_squad
RESUME: Squad sheet 1–8, five-state squad SM, six formations, Break/PatrolGrouping triggers with enemy SM.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

Source: [`../consider/squad_sheet.MD`](../consider/squad_sheet.MD)

---

Source: `[../consider/squad_sheet.MD](../consider/squad_sheet.MD)`.

## `SQUAD-01` — Squad sheet


| Field         | Definition                                                            |
| ------------- | --------------------------------------------------------------------- |
| `Id`          | Unique squad id                                                       |
| `Strategy`    | `PatrolGrouping` · `PatrolAround` · `LoopBack` · `Approach` · `Break` |
| `Formation`   | `V` · `Circle` · `CircleII` · `CircleIII` · `CircleIV` · `LineDivers` |
| `Members`     | 1–8                                                                   |
| `Leader`      | Highest `LVL` (tie → lowest `Id`); **required for** `V` (`D17`)       |
| `Center`      | 1 slot — `CircleIV`                                                   |
| `InnerCircle` | 3–4 slots — `CircleII`–`IV`                                           |
| `OuterCircle` | 4–8 slots — `Circle`, `CircleIII`, `CircleIV`                         |
| `Ticks`       | Countdown to strategy chance roll                                     |


## `SQUAD-02` — Squad strategies

tag_s_squad_strategy_sm


| State            | Behaviour                                                   |
| ---------------- | ----------------------------------------------------------- |
| `PatrolGrouping` | Slow sine approach; accepts Fleeing enemies into free slots |
| `PatrolAround`   | Fast sine approach                                          |
| `LoopBack`       | Circular path ending near start                             |
| `Approach`       | Move straight at the player                                 |
| `Break`          | Dissolve formation; fires `OnBreakGroup`                    |


## `SQUAD-03` — Formations

tag_s_squad_formation_recipes


| Formation    | Composition                                         |
| ------------ | --------------------------------------------------- |
| `V`          | Same class; follows Leader at the V tip             |
| `Circle`     | 4–8 same-class OuterCircle                          |
| `CircleII`   | 3 Tankers front + 4 Warriors Inner                  |
| `CircleIII`  | 3 Warriors Inner + 4 Rogues Outer                   |
| `CircleIV`   | 1 Tanker Center + 3 Warriors Inner + 4 Rogues Outer |
| `LineDivers` | Same-class line dive; may form a new squad          |


Mixed recipes are illegal unless membership satisfies the table. `V` / `Circle` = single class only.

## `SQUAD-04` — Squad ↔ Enemy triggers (`D16`)


| Trigger            | Effect                                                               |
| ------------------ | -------------------------------------------------------------------- |
| `OnBreakGroup`     | Each member rolls `Flee` or same-class `LineDivers`                  |
| `OnPatrolGrouping` | A `Flee` enemy may occupy a free slot matching the desired formation |



## Requirements (`SQUAD-`)



| ID         | Prio | Requirement                       | Acceptance                           |
| ---------- | ---- | --------------------------------- | ------------------------------------ |
| `SQUAD-01` | must | Squad sheet 1–8 with roles        | Invalid member count rejected        |
| `SQUAD-02` | must | Five-state squad SM               | Break fires `OnBreakGroup`           |
| `SQUAD-03` | must | Six formations with class recipes | Illegal mix cannot be selected       |
| `SQUAD-04` | must | Break / PatrolGrouping triggers   | Flee can refill PatrolGrouping slots |

