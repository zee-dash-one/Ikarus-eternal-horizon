# Ikarus Eternal Horizon — BALANCE — Authored-value source

tag_g_engine tag_s_engine_balance_source
RESUME: Single `BALANCE` object — every authored value Core uses to simulate and canvas View uses to paint; live instance state stays off it.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.21

**Related:** [`architecture.spec.MD`](./architecture.spec.MD) (`D40`) · [`scenes.spec.MD`](./scenes.spec.MD) (Pause Dev Balancer · `SCENE-05`) · [`dev-tools.spec.MD`](./dev-tools.spec.MD) (`/dev` export → BALANCE at boot) · [`world.spec.MD`](./world.spec.MD) (`BALANCE.layout` / `camera`) · [`input.spec.MD`](./input.spec.MD) (`BALANCE.controls`) · [`decisions.spec.MD`](./decisions.spec.MD) (`D46`)

Port of docs2 `RUL-12` / POC2 `poc2/src/core/balancer.ts` — **expanded:** not sim numbers only. Canvas presentation constants belong here too.

---

## Scope (Orchestrator)

tag_g_engine tag_s_engine_balance_source tag_s_engine_core_view_split
RESUME: Theme 1 data plane — one typed `BALANCE` for Core, canvas View, and the Pause Dev Balancer.

| In | Out |
| --- | --- |
| Root `BalanceConfig` shape, export rule (`core/balancer.ts` only), what is authored vs live, Theme 1 required namespaces | Exact feel numbers (`Q01`), Pause Dev tab chrome (`SCENE-05`), `/dev` form UI (`DEV-10`) |
| Canvas View paint keys (layout, render, later camera/HUD/palette) | DOM Login/Store/Result CSS (unless a shared token already lives on `BALANCE`) |
| Domain tables *defining* rows that `BALANCE` re-exports | A second runtime config object, `localStorage` SoT, literals in `render/` |

**`BALANCE`** is the frozen authored-config object. **Pause Balancer** is the SCENE-05 Dev UI that **binds the same object** (plus live sheets via Managers). They are not two sources.

Owner of the module: not a `*Manager` (`D22`). `BALANCE` is data. Runtime writes (Pause Dev, `/dev` export reload) go through boot/replace of the object + Manager commands — never per-frame mutation of nested tables.

**Code home (when Theme 1 implements):** `poc3/src/core/balancer.ts` exports `BALANCE` + `BalanceConfig`. Domain files may *define* tables; only this module *wires* them into `BALANCE`. Golden Rule: no `three` / DOM in `core/` (`ARCH-16`). Presentation values are numbers / strings / ids — not `THREE.Color` / materials.

---

## Requires (Orchestrator)

| Need | Source | Status |
| --- | --- | --- |
| Core / View split; View may import Core types | `D40` · [`architecture.spec.MD`](./architecture.spec.MD) | closed |
| Frame live stats from Summary / snapshot only | `D07` | closed |
| Controls remap tables | [`input.spec.MD`](./input.spec.MD) `CTRL-01` | closed |
| Layout / camera / parallax keys | [`world.spec.MD`](./world.spec.MD) · `D44` | closed (Theme 2 fills numbers) |
| Pause Dev binds live + authored | `SCENE-05` | closed (UI later) |
| `/dev` export loads into BALANCE at boot | `D43` · [`dev-tools.spec.MD`](./dev-tools.spec.MD) | closed (CRUD later) |
| `poc3/` scaffold | Theme 0 · `ARCH-01` | **open for implementation** — does not block this contract |

Sign-off: Orchestrator — types below are the Theme 1 SoT for authored values. Do not implement production `balancer.ts` until `.docs3/specs/balance/RUL-12.spec.ts` exists (it does).

---

## Data contract (Programming)

tag_g_engine tag_s_engine_balance_source tag_s_engine_core_view_split
RESUME: Locked TypeScript shape — Core, canvas View, tests, and Pause Balancer import the same `BALANCE`.

Sketch — **not** production code. Production copies these names into `poc3/src/core/balancer.ts`. English identifiers only (`D05`).

### Memory / Fields

| Rule | Detail |
| --- | --- |
| One export | Production reads **`BALANCE`** from `core/balancer.ts` only. Sibling table files must not be imported by `systems/` · `gameobjects/` · `render/`. |
| Authored vs live | **Authored** = catalogs, feel, layout, palette, remap, pool sizes, VFX *parameters*. **Live** = pose, Summary `HP`/`SHD`/`ENE`, `integrityState`, pool occupancy — those stay on **WorldSnapshot** / Summary (`D07`/`D40`). |
| Valid | A value is valid for sim or canvas paint **iff** it is a key on `BALANCE` (typed). Unknown keys rejected at boot / catalog load. |
| Canvas View | `syncRender` paints from **WorldSnapshot + `BALANCE`**. No hex colours, FOV, letterbox sizes, bar thicknesses, particle counts, or mesh scales invented in `render/`. |
| Core | Sim constants (speeds, pool caps, remap, spawn stubs) come from `BALANCE`. No gameplay numeric literals in Managers. |
| Identity | Missing multiplicative feel factors default to **`1`**; missing additive to **`0`** — same spirit as empty CHAR (`CHAR-02`). |
| Zero alloc | `BALANCE` is allocated at boot. Hot path reads fields; it does not clone the object per tick. |
| Pause Balancer | Dev tab fields = keys Core or View actually read. If it is used to paint or simulate, it is on `BALANCE` and therefore editable here (`SCENE-05`). |
| `/dev` | Export JSON hydrates catalog namespaces on boot. Runtime still reads `BALANCE`, not Dexie (`D43`). |

### Types

```typescript
/** Theme 1 required namespaces. Later themes add siblings on the same root — never a second object. */
export interface BalanceConfig {
  readonly layout: LayoutBalance;
  readonly render: RenderBalance;
  readonly controls: ControlsBalance;
  readonly loop: LoopBalance;
  readonly camera?: CameraBalance;       // Theme 2 · world.spec.MD
  readonly followBox?: FollowBoxBalance; // Theme 2
  readonly parallax?: ParallaxBalance;   // Theme 2
  readonly world?: WorldBalance;         // Theme 2 · despawn
  readonly sheet?: SheetBalance;         // Theme 3
  readonly hud?: HudBalance;             // Theme 10
  readonly weapons?: unknown;            // Theme 5 / 11
  readonly equipment?: unknown;          // Theme 12
  readonly enemies?: unknown;            // Theme 8
  readonly squads?: unknown;             // Theme 9
  readonly meteors?: unknown;            // Theme 6
  readonly drops?: unknown;              // Theme 7
  readonly store?: unknown;              // Theme 14
  readonly audio?: unknown;
}

export interface LayoutBalance {
  readonly aspect: number;          // 16/9 until Q43
  readonly letterboxColor: number;  // hex 0xRRGGBB
  readonly cssWidth: number;
  readonly cssHeight: number;
}

export interface RenderBalance {
  readonly background: number;      // hex — canvas clear / scene
  readonly pixelRatioCap: number;
  readonly antialias: boolean;
}

export interface LoopBalance {
  readonly dtClampSec: number;      // GameLoop max step (not SIM_DT)
}

export interface ControlsBalance {
  readonly keyboard: Readonly<Record<string, string>>;
  readonly mix: Readonly<Record<string, string>>;
  readonly gamepad: Readonly<Record<string, string>>;
  readonly touch: Readonly<Record<string, string>>;
}

export declare const BALANCE: BalanceConfig;
```

`SIM_DT = 1/60` stays a Core tick constant (`ARCH-17`) — it is the clock, not a feel knob. `loop.dtClampSec` *is* a feel/safety knob and lives on `BALANCE`.

**Defaults vs persisted:** `BALANCE.controls.*` seeds **`createDefaultInputBindings()`** only. Player remap lives in runtime **`InputBindings`** persisted via `control-settings.ts` (Dexie). Remap edits physical→virtual mappings — never virtual roles (`CTRL-02`).

Physical → virtual default tables are `BALANCE.controls.*`; runtime tables are `InputBindings` (`CTRL-01` / `CTRL-02`).

---

## View

tag_g_engine tag_g_scene_flow tag_s_engine_balance_source tag_s_scene_canvas_render
RESUME: Canvas Start/Title/Run/Pause + HUD overlay read presentation keys from BALANCE; they do not own a shadow palette.

| Surface | Reads |
| --- | --- |
| `render/` (`syncRender`) | Snapshot pose/events + `BALANCE.layout` / `render` / (later) `camera` · `parallax` · `hud` · palette keys |
| Letterbox | `BALANCE.layout` (`D44`) |
| Pause Dev Balancer | The same `BALANCE` object (plus live sheets via Managers) |
| DOM Login / Store / Result | **Out of this pass** except tokens already shared (e.g. `BALANCE.store.ui_shake_duration`) |

View **may** import `BALANCE` from `core/balancer.ts`. That is not a Golden Rule violation — values are plain data, not Three.js.

---

## BALANCE (Game Design)

tag_g_engine tag_s_engine_balance_source
RESUME: Game Design owns every number and colour on BALANCE; Programming does not invent presentation literals.

**Stubs this pass** — Theme 1 locks keys, not feel. Fill `layout` / `render` / `controls` / `loop` when `poc3/` lands; other namespaces when their theme opens.

| Key | Intent |
| --- | --- |
| `layout.aspect` / `cssWidth` / `cssHeight` / `letterboxColor` | Playfield box + bars (`D44`) |
| `render.background` / `pixelRatioCap` / `antialias` | Canvas clear and GPU caps |
| `loop.dtClampSec` | Max rAF catch-up slice |
| `controls.{keyboard,mix,gamepad,touch}` | Default physical → virtual seed (`InputBindings` defaults · `CTRL-02`) |

Palette, HUD chrome, camera FOV, drop colours, weapon VFX params land in their theme namespaces **on this same object**.

---

## Requirements (`RUL-12`)

| ID | Prio | Theme | Requirement | Acceptance |
| --- | --- | --- | --- | --- |
| `RUL-12` | must | 1 | Single `BALANCE` authored-value source for Core sim and canvas View paint (`D46`) | Core and canvas View read authored values only from `BALANCE`; `render/` has no presentation literals; live pose/HP stay on WorldSnapshot / Summary |

---

## Open questions

| # | Question | Default until tuned |
| --- | --- | --- |
| Q01 | Exact class / rank / camera / HUD numbers | stubs on `BALANCE`; not in this file’s prose |
| Q43 | Playfield 16:9 vs 9:16 | **16:9 landscape** (`D44`) |
