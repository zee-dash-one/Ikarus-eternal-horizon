# Ikarus Eternal Horizon — Rankings — Leaderboards

> **Itch release clarification (2026-10-19):** shared rankings use our HTTPS service behind ItchRankingAdapter, with the same four UTC periods; do not implement against a presumed Itch leaderboard API. IndexedDB alone provides browser-local data, not shared boards. See [itch-release.spec.MD](./itch-release.spec.MD), ITCH-06.

> **D50 revision (2026-10-02):** implement local SQLite rankings first through DemoHost; Dexie mirrors/platform uploads below are future scope. Screen is accessible from **Title and Result**. Active work: [todo-codex.md](../todo-codex.md), section B.

## DEV acceptance additions

- Normal first; preserve separate mode keys, show Survivor unavailable until playable. Four working period tabs are required now, not deferred UI polish.
- Server is authoritative for UTC buckets; weeks start Monday, months and years are civil periods, eternal has no lower bound. Use half-open intervals `[start, nextStart)`; do not truncate subsecond timestamps at 23:59:59.
- Store run history in SQLite, one run per unique runId; repeated result callbacks/retries cannot duplicate score. Each board selects the best eligible run per user/mode within that period. Different periods may select different runs.
- Order: score descending, kills descending, duration ascending, runId ascending for a stable final tie-break. Show public display name, never email.
- Authoritative completion time is stamped by the host on first valid finalization and retained on retry; client timestamps are diagnostic. Offline historical bucketing needs a later verified protocol.
- DEAD finalizes; DRIFTING does not. Quit/cancelled and debugger-modified runs do not enter normal boards. Local DEV validation does not claim production anticheat.
- Loading/empty/error/retry states, current-player highlight and return to Title are required. HUD gets cached best score through its presentation model, never localStorage reads per frame.


tag_g_rankings tag_s_rankings_submit_pipeline tag_s_rankings_local_adapter tag_s_rankings_demo_adapter
RESUME: Eight UTC boards (Normal/Survivor × W/M/Y/E); RankingManager platform-blind; one RankingPlatformAdapter per build (Demo · Itch · Poki · Steam) via PlatformKit — same pattern as Store (`D36`); Demo → DemoHost (`D38`).

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.10

Satellite: [`../../.docs2/plans-later/ranking-plan.spec.MD`](../../.docs2/plans-later/ranking-plan.spec.MD)

**Related:** [`builds.spec.MD`](./builds.spec.MD) (`D37` · PlatformKit) · [`architecture.spec.MD`](./architecture.spec.MD) (`D38`/`D39`) · [`store.spec.MD`](./store.spec.MD) (`D36` twin pattern) · [`achievements.spec.MD`](./achievements.spec.MD) (`D28`)

---

## Platform adapters (`D30`) — same shape as Store

tag_g_rankings tag_s_rankings_submit_pipeline tag_s_rankings_local_adapter tag_s_rankings_demo_adapter
RESUME: RankingManager talks only to RankingPlatformAdapter; build injects one concrete adapter (Demo · Itch · Poki · Steam).

Run/Result systems call **only** `RankingManager` — never Steamworks, Poki SDK, or Itch APIs directly.

### Why this shape (locked — parity with Store `D36`)

| Option | Verdict |
| --- | --- |
| **A. Interface + one concrete adapter per build** | **Chosen** — identical mental model to Store / ACH |
| B. RankingManager with `#ifdef` host calls | Rejected — SDK leaks; untestable |
| C. Shared WebSocket leaderboard service | Rejected for UI/transport — Demo uses **HTTPS REST** on DemoHost (`D38`), not WS |

**Injection:** `IKARUS_PLATFORM=demo|itch|poki|steam` selects the kit module ([`builds.spec.MD`](./builds.spec.MD)). Boot:

```text
RankingManager.setPlatformAdapter(platformKit.rankings)  // once — no mid-session swap
```

```text
[Build: Steam] ──► SteamRankingAdapter ──┐
[Build: Poki]  ──► PokiRankingAdapter  ──┤
[Build: Itch]  ──► ItchRankingAdapter  ──┼─► RankingManager (core)
[Build: Demo]  ──► DemoRankingAdapter  ──┘
                   (Local always mirrors personal bests)
```

### Port contract (sketch)

```typescript
interface RankingPlatformAdapter {
  readonly id: 'demo' | 'local' | 'itch' | 'poki' | 'steam';
  /** Persist / upload KeepBest for the boards this run touches */
  submitScore(boardApiName: string, payload: RankSubmitPayload): Promise<'OK' | 'QUEUED' | 'REJECTED'>;
  /** Optional remote rows — Local returns personal bests only */
  fetchBoard?(boardApiName: string, view: 'local' | 'global' | 'friends' | 'around'): Promise<RankRow[]>;
  flushUploadQueue?(): Promise<void>;
  dispose(): void;
}
```

`id: 'local'` is for unit tests / offline harness — production Demo uses `id: 'demo'`.

```typescript
interface RankSubmitPayload {
  score: number;
  kills: number;
  durationMs: number;
  buildVersion: string;
  mode: 'normal' | 'survivor';
  endedAt: string; // ISO UTC
}
```

### Adapter matrix (4 builds)

| Build | Adapter | Persist / upload | Extra |
| --- | --- | --- | --- |
| **Demo** | `DemoRankingAdapter` | Dexie Local mirror + DemoHost `/api/rankings/*` → SQLite | Shared boards on personal VPS (`D38`) |
| **Itch** | `ItchRankingAdapter` | **Dexie** Local mirror + Itch leaderboard API | Same `LB_*` ids |
| **Poki** | `PokiRankingAdapter` | Profile bests in **Poki SDK** gameplay blob + Poki score upload API | Same `LB_*` ids |
| **Steam** | `SteamRankingAdapter` | **Tauri FS** personal bests + Steamworks KeepBest | Global / Friends / Around (`RNK-08`); Cloud via `D39` |

### Rules (locked)

| # | Rule |
| --- | --- |
| R1 | **One** platform ranking adapter active per boot (Demo = `DemoRankingAdapter`) |
| R2 | **Local always mirrors** personal bests — **Dexie** on Itch/Demo web; **Poki SDK** gameplay blob on Poki; **Tauri FS** on Steam |
| R3 | Core never imports host SDKs; only the adapter module does |
| R4 | Same 8 `LB_*` API names on every host |
| R5 | Offline → queue upload (`RNK-07`); flush on reconnect |
| R6 | Wired from the **same** `PlatformKit` as Store + ACH (`D37` · `BLD-04`) |

---

## Board matrix (locked)

**2 modes × 4 UTC periods = 8 boards.** Highest **score** wins. Modes **never mix**.

|  | Weekly `W` | Monthly `M` | Annual `Y` | Eternal `E` |
| --- | --- | --- | --- | --- |
| **Normal** (`arcade`) | ✓ | ✓ | ✓ | ✓ |
| **Survivor** | ✓ | ✓ | ✓ | ✓ |

| Mode | Systems | Intent |
| --- | --- | --- |
| **Normal** | Craft, equip, skills, full arsenal | System mastery |
| **Survivor** (v1) | One-shot from zero · **Laser only** · craft/skills **off** | Pure skill |

#### Period rules (UTC)

| Period | Window | Reset |
| --- | --- | --- |
| **Weekly** | Mon 00:00 → Sun 23:59:59 UTC | Weekly |
| **Monthly** | 1st 00:00 → last day 23:59:59 UTC | Monthly |
| **Annual** | 1 Jan → 31 Dec UTC (civil year) | Yearly |
| **Eternal** | Since launch | Never |

- Run counts by **`endedAt`** (not `startedAt`).
- Same run may be personal best in multiple periods simultaneously.
- UI shows local time with **“UTC”** note for period boundaries.
- **Tie-break:** score ↓ · kills ↓ · duration ↑ (faster run wins).

#### Submit payload

| Field | Role |
| --- | --- |
| `score` | Ranked value |
| `kills` | Metadata / tie-break |
| `durationMs` | Metadata / tie-break |
| `buildVersion` | Patch filter (`IKARUS_BUILD_VERSION`) |
| `mode` | `normal` \| `survivor` |
| `endedAt` | UTC timestamp for period bucket |

Submit only when `score > 0` and run is **valid** (legitimate end — player **DEAD** in Normal/Survivor; no partial continue).

#### Stable board API names (immutable after release)

| Mode | Weekly | Monthly | Annual | Eternal |
| --- | --- | --- | --- | --- |
| Normal | `LB_ARCADE_WEEKLY` | `LB_ARCADE_MONTHLY` | `LB_ARCADE_ANNUAL` | `LB_ARCADE_ETERNAL` |
| Survivor | `LB_SURVIVOR_WEEKLY` | `LB_SURVIVOR_MONTHLY` | `LB_SURVIVOR_ANNUAL` | `LB_SURVIVOR_ETERNAL` |

Same IDs in Local storage keys and platform Partner registration.

#### `RankingManager` contract (sketch)

```
submitRun(payload)           // end of valid run → Local + platform adapter
getLocalBest(mode, period)
getBoardView(mode, period)   // local rows; platform views when adapter live
flushUploadQueue()
setPlatformAdapter(adapter)  // boot only — D30 / D37
dispose()
```

#### Rankings panel (`SCENE-04` partial · `D42`)

**DOM shell** (`#rankings-root`) — same HTML/CSS + JS Bridge stack as Login/Store. **Not** a canvas scene. `RankingsUIBridge` ↔ `RankingManager`. **Normal | Survivor** tabs → **Weekly | Monthly | Annual | Eternal**. Shows local bests first; Steam Global/Friends/Around when `SteamRankingAdapter` active. Period rollover → brief reset notice. Top ranks may grant **cosmetic** title/badge only — no combat power (`RNK-09`).

---

## Requirements & Survivor (`RNK-`)

tag_g_rankings tag_s_rankings_board_matrix tag_s_rankings_survivor_mode
RESUME: Eight UTC leaderboards (Normal/Survivor × W/M/Y/E), Local persistence, platform upload adapters, Rankings DOM panel.

Source satellite: `[../../.docs2/plans-later/ranking-plan.spec.MD](../../.docs2/plans-later/ranking-plan.spec.MD)`.

#### Survivor mode (v1)

| Rule | Value |
| --- | --- |
| Attempts | **One-shot** — DEAD ends run; no continue |
| Loadout | From zero — base Integrity/Shield Summary; no inherited inventory/skills/equips |
| Weapon | **Primary Laser only** (Secondary off) |
| Special Ordnance | Off |
| Craft / skills | Off (`Q11`) |
| Pause | System pause OK; **no** inventory/lab/craft management tabs |
| Difficulty | Same sprint/wave progression as Normal (D49; FLOW-01–09) |
| Submit | Only on legitimate run end |

**Later:** Survivor+ (full arsenal, still no meta) · daily shared seed (`Q14`).

#### Fair play

| Topic | Normal | Survivor |
| --- | --- | --- |
| Meta power between runs on boards | Forbidden | Forbidden |
| Craft/skills in run | Allowed | Off (v1) |
| Partial / continue submit | Invalid | One-shot only |
| Cheat / tamper | Reject score | Reject score |
| Balance patch | Tag `buildVersion`; period reset if needed | Same |

#### Requirements

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `RNK-01` | must | Local bests — Normal Eternal minimum (`LocalRankingAdapter`) | Survives reload |
| `RNK-02` | should | UTC windows W/M/Y authoritative on server in DEV (D50) | Weekly board resets on Monday UTC |
| `RNK-03` | defer | Survivor mode playable per table above | Zero loadout, laser only, one-shot |
| `RNK-04` | should | Rankings **DOM** UI: 2 modes × 4 periods (`#rankings-root`, `D42`) | Tabs show separated local bests |
| `RNK-05` | must | Modes never mix on a board | Survivor score never listed under Normal |
| `RNK-06` | defer | `SteamRankingAdapter` — 8 boards, KeepBest | Score on correct `LB_*` board |
| `RNK-07` | defer | Offline upload queue + sync | Queued score uploads on reconnect |
| `RNK-08` | defer | Steam views Global / Friends / Around user | Toggle in Rankings UI |
| `RNK-09` | defer | Cosmetic rank title/badge | No combat stat grants |
| `RNK-10` | should | `ItchRankingAdapter` when itch build | Upload uses same `LB_*` mapping |
| `RNK-11` | should | `PokiRankingAdapter` when poki build | Upload uses same `LB_*` mapping |
| `RNK-12` | must | One ranking adapter per `IKARUS_PLATFORM` kit (`D30`/`D37`/`D38`) | Demo=`DemoRankingAdapter`; Steam SDK absent from web bundles |
