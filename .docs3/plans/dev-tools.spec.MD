# Ikarus Eternal Horizon — Dev Tools (Content CRUD)

> **D47 override:** current DEV content persistence uses DemoHost API → local SQLite, through the existing bridge/manager boundary. Dexie dev-content-store statements below are superseded for DEV. Export remains versioned content data; the Pause debugger is separate and marks affected runs ineligible for normal rankings.


tag_g_dev tag_s_dev_crud tag_s_dev_content_manager
RESUME: DEV-only `/dev/*` HTML CRUD routes — filter, list, create, edit, delete game content; DevContentManager + JS Bridge; compiled out of production.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.20

**Related:** [`architecture.spec.MD`](./architecture.spec.MD) (`ui/` · `D40`) · [`builds.spec.MD`](./builds.spec.MD) (`BLD-05`) · [`equipment.spec.MD`](./equipment.spec.MD) (`EQP-01` · Special/Generic) · [`char-sheet.spec.MD`](./char-sheet.spec.MD) (`CHAR-01` · Effect slots) · [`enemy.spec.MD`](./enemy.spec.MD) · [`squad.spec.MD`](./squad.spec.MD) · [`scenes.spec.MD`](./scenes.spec.MD) (Pause **Dev** tab = live Balancer — different tool) · [`login.spec.MD`](./login.spec.MD) / [`store.spec.MD`](./store.spec.MD) (same DOM + JS Bridge pattern)

**Historical drafts:** [`../consider/char_sheet.MD`](../consider/char_sheet.MD) · [`../consider/enemy_sheet.MD`](../consider/enemy_sheet.MD) · [`../consider/squad_sheet.MD`](../consider/squad_sheet.MD)

---

## Scope vs Pause Dev tab

| Tool | Where | Purpose |
| --- | --- | --- |
| **Pause → Dev tab** (`SCENE-05`) | Canvas overlay on **Run** | Live **Balancer** — tune `BALANCE` numbers on the **current** session |
| **`/dev/*` CRUD** (this spec) | Standalone **DOM routes** | Author **persistent content records** — equips, buffs, enemies, squads — filter/list/create/edit/delete |

They share `import.meta.env.DEV` gating but **must not** share UI roots or managers.

---

## Architecture & UI stack

tag_g_dev tag_s_dev_ui tag_s_dev_ui_bridge tag_s_dev_routes
RESUME: Presentation is HTML/CSS admin tables/forms; authority is DevContentManager via same-document JS Bridge — no WebSocket.

Dev CRUD screens live under client routes **`/dev/*`** (Vite SPA — same shell as the game, **not** canvas scenes). Each entity type gets a list view + editor drawer/modal.

| Layer | Technology | Role |
| --- | --- | --- |
| **Presentation** | HTML + CSS (+ minimal TS bindings) | Tables, filters, forms, validation hints |
| **Bridge** | `DevCrudBridge` (same JS realm) | DOM events → `DevContentManager`; result → CSS/toast |
| **Authority** | `DevContentManager` | CRUD validation, id uniqueness, persist, export hook |
| **Persist** | `DevContentStore` (Dexie v1) | Local authoring DB — **not** player profile save (`D39`) |

**`D23` exception (locked):** `/dev/*` is **DOM shell chrome** like Login/Store (`D34`/`D41`). Never a canvas scene swap.

### Routes (locked v1)

**Four** entity modules. Special and Generic equips share **one** page; slot kind is a **required** form field, not a route.

| Route | Entity | Design anchor |
| --- | --- | --- |
| `/dev/equips` | **Equips** (Special + Generic) — required `equipType` | `CHAR-01` · [`equipment.spec.MD`](./equipment.spec.MD) `EQP-01` |
| `/dev/buffs` | **Buffs / Effects** — temporary Summary patches (Effect slots) | `CHAR-01` Effect slots · contextual `when` (`EQP-02`) |
| `/dev/enemies` | **Enemies** — Enemy Base + class + CHAR sheet binding | `ENEMY-01`–`03` · [`consider/enemy_sheet.MD`](../consider/enemy_sheet.MD) |
| `/dev/squads` | **Squads** — squad sheet + formation defaults | `SQUAD-01`–`03` · [`consider/squad_sheet.MD`](../consider/squad_sheet.MD) |

Optional hub: `/dev` → index linking all **four** CRUD modules.

**`equipType` (required on create/update):** `generic` **or** one of the 12 Special ids (`Primary_Weapon`, `Secondary_Weapon`, `Dash`, `Bomb`, `Wings`, `Shield`, `Armor`, `Rockets`, `Engine`, `Collector`, `Converter`, `Lab`). Missing / unknown type → validation error; save blocked. Export still splits rows into `EquipCatalog.special` vs `.generic` (`kind` + `specialSlot` on Special).

```text
[HTML /dev/enemies] --save--> DevCrudBridge.save(record)
                                    │
                                    ▼
                          DevContentManager.validate + persist
                                    │
                          DevContentStore (Dexie)
                                    │
                                    ▼
                          exportDevContent() → BALANCE/content/*.json (build/dev boot)
```

Gameplay Core **never** reads Dexie directly at runtime — boot loads exported JSON into `BALANCE` / content registries (same pattern as static catalog).

---

## Entity sketches (v1 contract)

tag_g_dev tag_s_dev_entities
RESUME: CRUD records mirror EQP-01 catalog types; enemy/squad sketches remain Theme 0d.

Equip / buff rows **are** `SpecialEquipItem` / `GenericEquipItem` / `EffectItem` ([`equipment.spec.MD`](./equipment.spec.MD)). The **form** is one `DevEquipRecord`; persist/export maps `equipType` → catalog `kind`.

### Equip (`DevEquipRecord`) — single `/dev/equips` form

| Field | Rule |
| --- | --- |
| `id` | Stable kebab/snake id — unique |
| `displayName` | UI label |
| `equipType` | **Required.** `generic` \| `Primary_Weapon` \| `Secondary_Weapon` \| `Dash` \| `Bomb` \| `Wings` \| `Shield` \| `Armor` \| `Rockets` \| `Engine` \| `Collector` \| `Converter` \| `Lab` |
| `grants` | `EQP-01` grant list `{ field, value, when? }[]` |
| `tags` | Optional filter tags for list view |

| `equipType` | Catalog row |
| --- | --- |
| `generic` | `GenericEquipItem` (`kind: 'generic'`; no `specialSlot`) |
| any Special id | `SpecialEquipItem` (`kind: 'special'`; `specialSlot === equipType`) |

List toolbar may filter by `equipType`. There is **no** separate Special vs Generic route.

### Buff / Effect (`DevBuffRecord`)

Maps 1:1 to `EffectItem` in [`equipment.spec.MD`](./equipment.spec.MD) (`EQP-01` data contract).

| Field | Rule |
| --- | --- |
| `id` | Unique |
| `displayName` | UI label |
| `durationTicks` | Effect duration (`0` allowed) |
| `cooldownTicks` | Effect slot cooldown (`0` allowed) |
| `grants` | Same `EquipGrant[]` as Special/Generic — Summary-only patch while active (`CHAR-05`) |

`when` lives **per grant**, not on the buff row.

### Enemy (`DevEnemyRecord`)

Maps 1:1 to `EnemyTemplate` in [`enemy.spec.MD`](./enemy.spec.MD).

| Field | Rule |
| --- | --- |
| `id` | Unique — maps to Enemy Base `id` |
| `displayName` | UI label |
| `class` | `Tanker` · `Warrior` · `Rogue` · `Special` (`ENEMY-03`) |
| `race` | `Maldroids` · `Hollows` · `Orcs` · `Prismari` |
| `rank` | `{ kind, droneBand? }` — drone band 1–12 |
| `charTemplateId` | Reference to CHAR sheet template / default equip loadout |
| `defaultStrategy` · `defaultTicks` | Enemy Base defaults (`ENEMY-01`) |
| `tags` | Spawn pool filters |

### Squad (`DevSquadRecord`)

Maps 1:1 to `SquadTemplate` in [`squad.spec.MD`](./squad.spec.MD).

| Field | Rule |
| --- | --- |
| `id` | Unique — squad sheet `id` |
| `displayName` | UI label |
| `defaultFormation` | `V` · `Circle` · … · `LineDivers` (`SQUAD-03`) |
| `memberCount` | 1–8 (`SQUAD-01`) |
| `memberTemplateIds` | Ordered enemy template refs (class mix must satisfy `FORMATION_RECIPES`) |
| `defaultStrategy` · `defaultTicks` | Squad SM defaults |
| `tags` | Optional |

---

## CRUD operations (all routes)

tag_s_dev_crud
RESUME: Filter · List · Create · Read · Update · Delete — uniform across entity types.

| Op | UI | Manager |
| --- | --- | --- |
| **Filter** | Search box + tag/class/slot filters per entity | `list(query)` |
| **List** | Sortable table — id, displayName, key fields | `list(query)` |
| **Create** | Empty form → Save | `create(record)` |
| **Read** | Row click → editor | `getById(id)` |
| **Update** | Editor Save | `update(record)` |
| **Delete** | Confirm dialog | `delete(id)` |

| Rule | Detail |
| --- | --- |
| R1 | **DEV builds only** — routes 404 or redirect when `import.meta.env.PROD` (`BLD-05`) |
| R2 | **JS Bridge only** — no WebSocket (`D43`) |
| R3 | UI never writes Dexie directly — `DevCrudBridge` only |
| R4 | `id` immutable after create — edits change other fields only |
| R5 | Delete is hard delete in DevContentStore; export snapshot on demand |
| R6 | Validation errors stay on form — `.dev-crud--error` |
| R7 | Core/sim must not import `DevContentManager` or `/dev` UI |
| R8 | Player profile persist (`StoreManager`, etc.) is **separate** from dev content DB |

---

## Ownership (`D43`)

tag_g_dev tag_s_dev_content_manager
RESUME: DevContentManager owns dev authoring records; DevCrudBridge owns DOM binding.

| Owns (`DevContentManager`) | Does **not** own |
| --- | --- |
| CRUD validation per entity type | Pause Balancer (`SCENE-05` Dev tab) |
| Dexie schema + migrations (dev content) | Runtime spawn/sim (`EnemyManager`, `SquadManager`) |
| Export to content JSON | Store/RNK/ACH player saves |
| Route guard (DEV-only) | Full Sheet runtime recalc (`CHAR-05`) |

```typescript
interface DevContentManager {
  list(entity: DevEntityKind, query: DevListQuery): Promise<DevRecord[]>;
  getById(entity: DevEntityKind, id: string): Promise<DevRecord | null>;
  create(entity: DevEntityKind, record: DevRecord): Promise<DevResultCode>;
  update(entity: DevEntityKind, record: DevRecord): Promise<DevResultCode>;
  delete(entity: DevEntityKind, id: string): Promise<DevResultCode>;
  exportAll(): Promise<DevContentExportBundle>;
  dispose(): void;
}
```

---

## HTML / CSS structure (sketch)

tag_s_dev_ui
RESUME: Shared CRUD chrome — entity-specific columns plug into data tables.

```html
<section id="dev-crud-root" class="dev-crud" data-dev-route="/dev/enemies" hidden>
  <header class="dev-crud__header">
    <nav class="dev-crud__nav"><!-- links to /dev/* modules --></nav>
    <h1 class="dev-crud__title">Enemies</h1>
  </header>
  <div class="dev-crud__toolbar">
    <input type="search" class="dev-crud__filter" data-action="filter" placeholder="Filter…" />
    <button type="button" class="dev-crud__create" data-action="create">New</button>
  </div>
  <table class="dev-crud__table" data-list></table>
  <dialog class="dev-crud__editor" data-editor><!-- form fields --></dialog>
</section>
```

| CSS hook | Meaning |
| --- | --- |
| `.dev-crud--busy` | Save/delete in flight |
| `.dev-crud--error` | Validation failure |
| `.dev-crud__row.is-selected` | Active edit target |

---

## Requirements (`DEV-`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `DEV-01` | must | Four `/dev/*` CRUD routes exist in DEV builds only | `/dev/equips` · `buffs` · `enemies` · `squads` |
| `DEV-02` | must | HTML/CSS + `DevCrudBridge` ↔ `DevContentManager` (`D43`) | Same bridge pattern as Store/Login |
| `DEV-03` | must | Filter + list + create + edit + delete per entity | Uniform CRUD on all four modules |
| `DEV-04` | must | Persist via `DevContentStore` (Dexie) separate from profile save | Reload restores dev records |
| `DEV-05` | must | Production builds exclude `/dev` routes and bundle (`BLD-05`) | `PROD` → no dev CRUD reachable |
| `DEV-06` | should | Export dev content to JSON for game boot | `exportAll()` produces loadable bundle |
| `DEV-07` | must | Equip form requires `equipType` (`generic` + 12 Special ids) | Missing/unknown type → validation error; no save |
| `DEV-08` | should | Enemy form exposes class + strategy defaults | Matches `ENEMY-01`/`ENEMY-03` fields |
| `DEV-09` | should | Squad form exposes formation + member count 1–8 | Invalid formation mix flagged (stub OK v1) |
| `DEV-10` | defer | Generic equip + buff grant editors (full `EQP-01` UI) | Grant **types** locked; form chrome still stub JSON OK |
| `DEV-11` | defer | Import JSON into DevContentStore | Round-trip with export |

---

## BALANCE / content keys (Game Design)

| Key | Intent |
| --- | --- |
| `dev.exportPath` | Relative path for exported content JSON (default `content/dev-export.json`) |
| `dev.pageSize` | Default list page size |

---

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q39 | Router: path `/dev/*` vs hash `#/dev/*` | **History API paths** `/dev/enemies` with SPA fallback |
| Q40 | Auth gate on `/dev/*` | **DEV flag only** v1 — no extra password |
| Q41 | DemoHost stores dev content server-side | **Local Dexie only** v1; DemoHost CRUD API defer |
| Q42 | Buff vs Effect naming in UI | Label **Buffs**; code `DevBuffRecord` maps to Effect slots |
