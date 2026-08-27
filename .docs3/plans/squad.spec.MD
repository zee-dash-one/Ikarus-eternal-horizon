# Ikarus Eternal Horizon — SQUAD — Coordinated Group

tag_g_squad
RESUME: Squad sheet 1–8, five-state squad SM, six formations, Break/PatrolGrouping triggers with enemy SM.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.20

Source: [`../consider/squad_sheet.MD`](../consider/squad_sheet.MD) (this file wins on conflicts).

**This pass:** lock the **data contract** (`SQUAD-01` sheet · `SQUAD-02` strategy union · `SQUAD-03` formation recipes · `SQUAD-04` trigger names). SM ticks, Break runtime, and Flee refill stay rule tables; those SDD cases stay `it.todo` until Theme 9.

---

## Scope (Orchestrator)

tag_g_squad tag_s_squad_sheet_roles tag_s_squad_formation_recipes
RESUME: Catalog + runtime types for SquadManager, Pause Balancer, and `/dev/squads`.

| In | Out |
| --- | --- |
| Squad sheet (1–8), strategy/formation unions, role slots, locked `FORMATION_RECIPES`, trigger names | SM transitions, spatial follow, `OnBreakGroup` rolls, spawn volumes |
| Same types Pause Dev **Squad** tab and `DevSquadRecord` | `/dev` form chrome |

Squad SM is **independent** of each member’s Enemy SM (`D16`). Members are `EnemyCraft` ids, not nested sheets.

Owner: `SquadManager` ([`nomenclature.spec.MD`](./nomenclature.spec.MD) · `D22`).

**Code home (when implemented):** `poc3/src/core/squad/` (types + `isLegalSquadMembership`). Golden Rule: no `three` / DOM (`ARCH-16`).

---

## Requires (Orchestrator)

| Need | Source | Status |
| --- | --- | --- |
| Enemy class union + `FormationClass` | [`enemy.spec.MD`](./enemy.spec.MD) `ENEMY-03` | closed |
| Leader rule for `V` | `D17` | closed (runtime later) |
| Independent SMs | `D16` | closed |
| Vocabulary | [`nomenclature.spec.MD`](./nomenclature.spec.MD) | closed |
| `poc3/` scaffold | Theme 0 | **open for implementation** |

Sign-off for **data contract**: Orchestrator — types below are the SQUAD SoT. SDD files: `.docs3/specs/squad/SQUAD-01.spec.ts` … `SQUAD-04`.

---

## Data contract (Programming)

tag_g_squad tag_s_squad_sheet_roles tag_s_squad_strategy_sm tag_s_squad_formation_recipes tag_s_squad_enemy_triggers
RESUME: Locked TypeScript shapes — 1–8 members, six formation recipes, two trigger ids.

Sketch — **not** production code. Production copies these names into `poc3/src/core/squad/`. Import `FormationClass` from the ENEMY contract.

### Memory / Fields

| Rule | Detail |
| --- | --- |
| Member count | `members.length` always in **1–8**. `0` or `> 8` is invalid (reject create/update). |
| Roles | Per-member `role`. `null` = unassigned follower (legal on `V` / `LineDivers` wingmen). |
| `Front` | Recipe slot for **CircleII Tanker line only** — not a squad-level field. |
| Leader | Role **required** on formation `V` (`D17`). Circle family does **not** require Leader. |
| Recipes | `FORMATION_RECIPES` is exhaustive. Illegal class mix → `isLegalSquadMembership` false. |
| `Special` | Enemy class `Special` is never a legal recipe slot. |
| Triggers | Names only this pass: `OnBreakGroup` · `OnPatrolGrouping`. |
| Balancer | Pause Dev binds `SquadTemplate` + live `SquadSheet`. Writes → `SquadManager`. |
| Zero alloc | `members` pre-sized (max 8). No `push` per frame. |

### Types

```typescript
import type { EnemyClass, FormationClass } from '../enemy/enemy';

export const SQUAD_STRATEGIES = [
  'PatrolGrouping',
  'PatrolAround',
  'LoopBack',
  'Approach',
  'Break',
] as const;

export type SquadStrategy = (typeof SQUAD_STRATEGIES)[number];

export const SQUAD_FORMATIONS = [
  'V',
  'Circle',
  'CircleII',
  'CircleIII',
  'CircleIV',
  'LineDivers',
] as const;

export type SquadFormation = (typeof SQUAD_FORMATIONS)[number];

export const SQUAD_ROLES = [
  'Leader',
  'Center',
  'InnerCircle',
  'OuterCircle',
  'Front',
] as const;

export type SquadRole = (typeof SQUAD_ROLES)[number];

export const SQUAD_MEMBER_MIN = 1;
export const SQUAD_MEMBER_MAX = 8;

export const SQUAD_TRIGGERS = [
  'OnBreakGroup',
  'OnPatrolGrouping',
] as const;

export type SquadEnemyTrigger = (typeof SQUAD_TRIGGERS)[number];

export interface SquadMemberRef {
  enemyId: string;
  role: SquadRole | null;
}

export interface SquadSheet {
  id: string;
  strategy: SquadStrategy;
  formation: SquadFormation;
  ticks: number;
  members: SquadMemberRef[];
}

export interface FormationSlotSpec {
  role: SquadRole;
  count: number;
  class: FormationClass | 'same';
}

export interface FormationRecipe {
  formation: SquadFormation;
  sameClass: boolean;
  minMembers: number;
  maxMembers: number;
  slots: readonly FormationSlotSpec[];
}

/** Locked composition (`SQUAD-03`). */
export const FORMATION_RECIPES: readonly FormationRecipe[] = [
  {
    formation: 'V',
    sameClass: true,
    minMembers: 1,
    maxMembers: 8,
    slots: [{ role: 'Leader', count: 1, class: 'same' }],
  },
  {
    formation: 'Circle',
    sameClass: true,
    minMembers: 4,
    maxMembers: 8,
    slots: [{ role: 'OuterCircle', count: 0, class: 'same' }],
  },
  {
    formation: 'CircleII',
    sameClass: false,
    minMembers: 7,
    maxMembers: 7,
    slots: [
      { role: 'Front', count: 3, class: 'Tanker' },
      { role: 'InnerCircle', count: 4, class: 'Warrior' },
    ],
  },
  {
    formation: 'CircleIII',
    sameClass: false,
    minMembers: 7,
    maxMembers: 7,
    slots: [
      { role: 'InnerCircle', count: 3, class: 'Warrior' },
      { role: 'OuterCircle', count: 4, class: 'Rogue' },
    ],
  },
  {
    formation: 'CircleIV',
    sameClass: false,
    minMembers: 8,
    maxMembers: 8,
    slots: [
      { role: 'Center', count: 1, class: 'Tanker' },
      { role: 'InnerCircle', count: 3, class: 'Warrior' },
      { role: 'OuterCircle', count: 4, class: 'Rogue' },
    ],
  },
  {
    formation: 'LineDivers',
    sameClass: true,
    minMembers: 1,
    maxMembers: 8,
    slots: [],
  },
];

export interface SquadTemplate {
  id: string;
  displayName: string;
  defaultFormation: SquadFormation;
  memberCount: number;
  memberTemplateIds: readonly string[];
  defaultStrategy: SquadStrategy;
  defaultTicks: number;
  tags?: readonly string[];
}

export function isLegalMemberCount(n: number): boolean;
export function isLegalSquadMembership(
  formation: SquadFormation,
  members: readonly { class: EnemyClass; role: SquadRole | null }[],
): boolean;
```

**Circle `OuterCircle` count:** `slots[0].count = 0` means “all members occupy OuterCircle”; live count must still sit in `minMembers…maxMembers` (4–8).

**`V` / `LineDivers`:** exactly one `Leader` on `V`; remaining members `role: null`, all `same` class. `LineDivers`: all `role: null` (or all same class with no Leader required).

### Empty / identity

| Field | Default |
| --- | --- |
| `strategy` / `defaultStrategy` | `PatrolGrouping` |
| `formation` / `defaultFormation` | `V` |
| `ticks` / `defaultTicks` | `0` |
| `members` | **no empty squad** — create requires 1–8 refs |

### Rules (data layer)

- `memberTemplateIds.length === memberCount` on templates; `memberCount` in 1–8.
- Illegal mix (wrong class for a recipe slot, `Special` in a trio slot, count outside min/max) cannot be selected (`SQUAD-03`).
- Leader **identity** (highest `LVL`, tie → lowest enemy `id`) is runtime `D17` — not stored as a catalog field.

---

## View (Programming)

**N/A this pass.** Formation poses are Theme 9 View. No mesh in `core/`.

---

## BALANCE (Game Design)

**N/A this pass.** Slot **counts** in `FORMATION_RECIPES` are locked composition, not feel. Tick/chance tables (`Q02`) land in `BALANCE.squads.sm` later.

Reserved keys:

| Key | When |
| --- | --- |
| `BALANCE.squads.templates` | `SquadTemplate[]` |
| `BALANCE.squads.sm` | Tick intervals + transition chances (`Q02`) |

---

## `SQUAD-01` — Squad sheet

tag_s_squad_sheet_roles


| Field         | Definition                                                            |
| ------------- | --------------------------------------------------------------------- |
| `id`          | Unique squad id                                                       |
| `strategy`    | `PatrolGrouping` · `PatrolAround` · `LoopBack` · `Approach` · `Break` |
| `formation`   | `V` · `Circle` · `CircleII` · `CircleIII` · `CircleIV` · `LineDivers` |
| `members`     | 1–8                                                                   |
| `Leader`      | Highest `LVL` (tie → lowest `id`); **required for** `V` (`D17`)       |
| `Center`      | 1 slot — `CircleIV`                                                   |
| `InnerCircle` | 3–4 slots — `CircleII`–`IV`                                           |
| `Front`       | 3 Tankers — `CircleII` only                                           |
| `OuterCircle` | 4–8 slots — `Circle`, `CircleIII`, `CircleIV`                         |
| `ticks`       | Countdown to strategy chance roll                                     |


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

tag_s_squad_enemy_triggers


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
