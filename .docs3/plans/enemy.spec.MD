# Ikarus Eternal Horizon — ENEMY — Individual Craft

> **D48/D49 integration:** enemy movement and group behavior are the only permitted POC2 study references. Sector/faction catalogs restrict archetypes; WaveManager consumes deterministic WavePlans and EnemyManager owns entities/AI. No independent kill-based spawning/miniboss clock. See [run-flow.spec.MD](./run-flow.spec.MD).


tag_g_enemy
RESUME: Enemy Base fields, five-state strategy SM, Tanker/Warrior/Rogue classes and formation roles.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.20

Source: [`../consider/enemy_sheet.MD`](../consider/enemy_sheet.MD) (this file wins on conflicts).

Every enemy has a **CHAR sheet** **and** an Enemy Base SM (`D01`).

**This pass:** lock the **data contract** (`ENEMY-01` base + craft · `ENEMY-02` strategy union · `ENEMY-03` class union). SM transitions, pooling, and silhouette stay rule tables; those SDD cases stay `it.todo` until Theme 8.

---

## Scope (Orchestrator)

tag_g_enemy tag_s_enemy_base_fields tag_s_enemy_class_roles
RESUME: Catalog + runtime types for EnemyManager, Pause Balancer, and `/dev/enemies`.

| In | Out |
| --- | --- |
| Enemy Base (`id`, `strategy`, `ticks`), class/race/rank unions, `EnemyTemplate` / `EnemyCraft` (CHAR + base) | Tick-chance SM (`ENEMY-02` runtime), spawn/pool, shot/contact, silhouette mesh |
| Same types Pause Dev **Spawn/Enemy** tab and `DevEnemyRecord` | `/dev` form chrome |

Every live enemy is `EnemyCraft`: `base` + `sheet` (`CharSheet`). Frame AI reads **Summary** from `sheet.summary` (`D07`) plus `base.strategy` / `ticks`.

Owner: `EnemyManager` ([`nomenclature.spec.MD`](./nomenclature.spec.MD) · `D22`).

**Code home (when implemented):** `poc3/src/core/enemy/` (types + unions). Golden Rule: no `three` / DOM (`ARCH-16`).

---

## Requires (Orchestrator)

| Need | Source | Status |
| --- | --- | --- |
| CHAR sheet on every craft | [`char-sheet.spec.MD`](./char-sheet.spec.MD) | closed |
| Class trio + Special | `D15` · `D18` | closed (BALANCE kits later) |
| Independent of squad SM | `D16` | closed |
| Vocabulary (race / rank / class) | [`nomenclature.spec.MD`](./nomenclature.spec.MD) | closed |
| `poc3/` scaffold | Theme 0 | **open for implementation** |

Sign-off for **data contract**: Orchestrator — types below are the ENEMY SoT. SDD files: `.docs3/specs/enemy/ENEMY-01.spec.ts` · `ENEMY-02` · `ENEMY-03`.

---

## Data contract (Programming)

tag_g_enemy tag_s_enemy_base_fields tag_s_enemy_strategy_sm tag_s_enemy_class_roles
RESUME: Locked TypeScript shapes — catalog rows and live crafts; Balancer binds both.

Sketch — **not** production code. Production copies these names into `poc3/src/core/enemy/`. TS fields are **camelCase** (`id`, not `Id`). Import `CharSheet` from the CHAR contract.

### Memory / Fields

| Rule | Detail |
| --- | --- |
| Two layers | **Template** = authored catalog (`BALANCE.enemies` / `/dev`). **Craft** = pooled runtime instance. |
| CHAR always | `EnemyCraft.sheet` is a full `CharSheet` (54 slots). Empty craft defaults from CHAR `create()`. |
| `ticks` | Integer countdown ≥ 0. Decrement is SM behaviour (later). Identity `0` = due this step. |
| `squadId` | `null` = unattached. Squad membership does not replace individual `strategy` (`D16`). |
| Type-gate | `class: 'Special'` is excluded from mixed formation recipes (`SQUAD-03`). |
| Race vs class | Race is cosmetic/catalog; it **must not** change class or CHAR family shape (`ENEMY-03`). |
| Balancer | Pause Dev binds `EnemyTemplate` + live `EnemyCraft.base` / `sheet.summary`. Writes → Manager commands. |
| Zero alloc | Pool `EnemyCraft` at boot. No per-frame `new` of base/sheet. |

### Types

```typescript
import type { CharSheet } from '../sheet/char-sheet';

export const ENEMY_STRATEGIES = [
  'EnterGate',
  'FindGroup',
  'LoopBack',
  'Flee',
  'Fury',
] as const;

export type EnemyStrategy = (typeof ENEMY_STRATEGIES)[number];

export const ENEMY_CLASSES = [
  'Tanker',
  'Warrior',
  'Rogue',
  'Special',
] as const;

export type EnemyClass = (typeof ENEMY_CLASSES)[number];

/** Formation recipes use only the trio (`D15`). */
export const FORMATION_CLASSES = ['Tanker', 'Warrior', 'Rogue'] as const;

export type FormationClass = (typeof FORMATION_CLASSES)[number];

export const ENEMY_RACES = [
  'Maldroids',
  'Hollows',
  'Orcs',
  'Prismari',
] as const;

export type EnemyRace = (typeof ENEMY_RACES)[number];

export const ENEMY_RANK_KINDS = [
  'drone',
  'special',
  'mini_boss',
  'boss',
  'final',
] as const;

export type EnemyRankKind = (typeof ENEMY_RANK_KINDS)[number];

export const DRONE_BAND_MIN = 1;
export const DRONE_BAND_MAX = 12;

export interface EnemyRank {
  kind: EnemyRankKind;
  /** Required iff `kind === 'drone'`; integer 1–12. */
  droneBand?: number;
}

export interface EnemyBase {
  id: string;
  strategy: EnemyStrategy;
  ticks: number;
}

export interface EnemyTemplate {
  id: string;
  displayName: string;
  class: EnemyClass;
  race: EnemyRace;
  rank: EnemyRank;
  /** Catalog id of a CHAR loadout stub — resolved at spawn. */
  charTemplateId: string;
  defaultStrategy: EnemyStrategy;
  defaultTicks: number;
  tags?: readonly string[];
}

export interface EnemyCraft {
  readonly base: EnemyBase;
  readonly sheet: CharSheet;
  readonly class: EnemyClass;
  readonly templateId: string;
  squadId: string | null;
}

export function isFormationClass(c: EnemyClass): c is FormationClass;
```

### Empty / identity

| Field | Default |
| --- | --- |
| `strategy` / `defaultStrategy` | `EnterGate` |
| `ticks` / `defaultTicks` | `0` |
| `race` | `Maldroids` |
| `rank` | `{ kind: 'drone', droneBand: 1 }` |
| `squadId` | `null` |
| `sheet` | CHAR empty craft (`LVL = 1`, `LIGHT`) |

`id` / `templateId` / `charTemplateId` / `displayName` have no empty identity — spawn/catalog must supply them.

### Rules (data layer)

- Every runtime enemy **exposes** `base.id`, `base.strategy`, `base.ticks` (`ENEMY-01`).
- `droneBand` is invalid unless `rank.kind === 'drone'`; when present it is in `1…12`.
- `Special` class may use unique CHAR templates; it must not appear in `FORMATION_RECIPES` class slots ([`squad.spec.MD`](./squad.spec.MD)).

---

## View (Programming)

**N/A this pass.** Silhouette <0.3s is Theme 8 View (`ENEMY-03` acceptance). No mesh in `core/`.

---

## BALANCE (Game Design)

**N/A this pass** — data shape only. Class CHAR kits (`D18`) and SM tick/chance tables (`Q02`) land in `BALANCE.enemies` when Theme 8 goes green.

Reserved keys:

| Key | When |
| --- | --- |
| `BALANCE.enemies.templates` | `EnemyTemplate[]` |
| `BALANCE.enemies.classKits` | Tanker / Warrior / Rogue CHAR stubs (`Q01`) |
| `BALANCE.enemies.sm` | Tick intervals + transition chances (`Q02`) |

---

## `ENEMY-01` — Enemy Base

tag_s_enemy_base_fields

Every enemy has a CHAR sheet **and** an Enemy Base SM.


| Field      | Definition                                               |
| ---------- | -------------------------------------------------------- |
| `id`       | Stable unique id                                         |
| `strategy` | `EnterGate` · `FindGroup` · `LoopBack` · `Flee` · `Fury` |
| `ticks`    | Countdown to next chance roll for a strategy transition  |


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

tag_s_enemy_class_roles


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
