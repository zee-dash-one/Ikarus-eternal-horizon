# Ikarus Eternal Horizon — Architecture & Tech Stack

tag_g_builds tag_s_arch_stack tag_s_builds_demo_host tag_s_arch_persist_dexie
RESUME: Demo-first stack — Sim-first Core/View (`D40`); per-platform SDK persist; DemoHost; four PlatformKit builds.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.12

**Related:** [`builds.spec.MD`](./builds.spec.MD) (`D37`) · [`store.spec.MD`](./store.spec.MD) (`D36`/`D38`/`D39`) · [`rankings.spec.MD`](./rankings.spec.MD) (`D30`/`D38`) · [`scenes.spec.MD`](./scenes.spec.MD) (`SCENE-01`) · [`input.spec.MD`](./input.spec.MD) (`D27`/`D40`) · [`decisions.spec.MD`](./decisions.spec.MD) (`D38`–`D40`)

---

## Decision (`D40`) — Sim first, View second (Core / View split)

tag_g_engine tag_s_engine_core_view_split tag_s_engine_fixed_tick tag_s_engine_command_event_flow
RESUME: Default dev rule — pure fixed-tick Core owns all game truth; Presentation reads immutable snapshots and domain events only.

| Lock | Rule |
| --- | --- |
| **Order** | **Simulation logic first**, presentation second — specs/tests for Core before Three.js/audio/VFX |
| **Core truth** | Collisions, cooldowns, stats, RNG, run state, Summary Sheet reads — all in **Core / Sim** |
| **View blind** | View holds meshes, materials, particles, audio instances — **no** authoritative game state |
| **Imports** | Core **must not** import `three`, `window`, `document`, Web Audio, or DOM APIs |
| **View imports** | View **may** import Core types, Three.js, SoundManager façade, VFX pools |
| **Tick** | Core runs **fixed tick** (target **60 Hz**, constant `SIM_DT`); View runs on **`requestAnimationFrame`** (decoupled) |
| **Pause** | Pause gate stops Core ticks only (`D21`); View may still paint frozen frame + overlay |
| **I/O** | Input → **Commands** into Core; Core → **Domain Events** + **immutable Snapshot** out to View |
| **Managers** | `*Manager` sim logic lives in Core tick; `syncRender()` (or View adapters) apply snapshot to GPU/audio only |
| **Guardrails** | ESLint sim-boundary rules + `npm run verify` lint gate — see **Golden Rule** below (`ARCH-16`/`ARCH-20`) |

### Layer matrix

| Layer | Core / Sim | View / Presentation |
| --- | --- | --- |
| **Tech** | TypeScript pure | Three.js · Web Audio · particle pools |
| **Loop** | Fixed tick (`SIM_DT`) | `requestAnimationFrame` |
| **Owns** | World state · collisions · cooldowns · RNG · events | Meshes · transforms · opacity · SFX/VFX instances |
| **Imports Three/DOM?** | ❌ Forbidden | ✅ Allowed |
| **Source of truth** | ✅ Yes | ❌ Never |

### Data flow (unidirectional)

```text
[ Player Input ]
       │
       ▼
[ InputManager ] ──► Command (pure)  e.g. { type: 'FIRE_PRIMARY' }
       │
       ▼
[ Core Simulation ]  fixed tick · deterministic step
       │  mutates internal state (not exposed by reference)
       ├──► Domain Event[]   e.g. { type: 'PROJECTILE_SPAWNED', ... }
       └──► WorldSnapshot    immutable read model for View
       │
       ▼
[ Presentation ]  interpolate · syncRender · audio · VFX
       Three.js meshes / SoundManager / VfxManager
```

**Command example:** `{ type: 'CAST_SPELL', spellId: 'fireball' }` — Core validates cooldown/mana; View never decides hit outcome.

**Event example:** `{ type: 'DAMAGE_APPLIED', targetId, amount, shieldFirst }` — View plays flash/SFX; Core already applied sheet math.

### Folder mapping (`poc3/`)

| Path | Layer | Role |
| --- | --- | --- |
| `core/` | Sim | `GameLoop`, fixed tick, command bus, event bus, `WorldSnapshot` builder, RNG |
| `systems/` | Sim | `*Manager` logic — `updateSim(tick)` only; **no THREE** |
| `gameobjects/` | Sim | Entity/sim components — positions as plain numbers, integrity state |
| `pools/` | Sim (+ View alloc) | Sim-side object pools; View mesh pools live under `render/` |
| `render/` | View | Three.js meshes, `syncRender(snapshot, alpha)`, camera |
| `scenes/` | Bridge | Scene lifecycle — mounts View, wires Core tick subscription; flow UI may use CSS2D |
| `ui/` | View / shell | DOM store bridge, DEV chrome — not sim authority |
| `platform/` | Boot | PlatformKit — outside hot tick |
| `persist/` | I/O | Dexie / adapters — never on sim hot path (`D39`) |

### Dev workflow (locked)

1. **Orchestrator / TDD:** define Command + Event + Snapshot fields in spec.
2. **Programming (Sim):** implement Core tick + failing unit tests (**no Three.js**).
3. **Game Design:** tune `BALANCE` numbers consumed by Core only.
4. **Programming (View):** subscribe to events/snapshot; implement `syncRender` + audio/VFX.
5. **TDD:** integration tests mock snapshot; View tests optional/visual.

Aligns with agent rule: `updateSim(tick)` = logic · `syncRender()` = transforms/opacity/material only (`D40` supersedes generic `update(dt)` wording for Run).

### Architecture guardrails — Golden Rule (`ARCH-16` / `ARCH-20`)

tag_g_engine tag_s_engine_architecture_guardrails tag_s_engine_core_view_split
RESUME: ESLint + CI enforce Sim/View boundary — Core never imports Three.js, View, or DOM.

**Golden Rule:** if `src/core/`, `src/systems/`, or `src/gameobjects/` imports `three`, `render/`, `window`, or `document`, **`npm run verify` must fail**.

| Guard | Mechanism | When |
| --- | --- | --- |
| **ESLint** | `no-restricted-imports` + `no-restricted-globals` on sim globs | Every `npm run lint` |
| **CI / verify** | `npm run verify` = typecheck + **lint** + test — lint includes sim boundary | Pre-merge · Orchestrator DoD |
| **Grep backup** | Optional script rejects `from 'three'` under sim folders | CI redundancy |

**Sim globs (locked):** `src/core/**/*.ts` · `src/systems/**/*.ts` · `src/gameobjects/**/*.ts`

**Forbidden in sim globs:**

| Category | Blocked |
| --- | --- |
| Three.js | `three`, `three/*` |
| View layer | `**/render/*` imports |
| DOM | `window`, `document` globals |

#### ESLint flat config (`poc3/eslint.config.js`)

Project uses **ESLint flat config** (poc2 parity) — not legacy `.eslintrc.js`. Merge snippet from [`.docs3/templates/eslint-sim-boundary.snippet.js`](../templates/eslint-sim-boundary.snippet.js):

```javascript
// poc3/eslint.config.js — append after base tseslint.config(...)
{
  files: [
    'src/core/**/*.ts',
    'src/systems/**/*.ts',
    'src/gameobjects/**/*.ts',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'three',
            message: 'Core/Sim must not import Three.js (D40 · ARCH-16).',
          },
        ],
        patterns: [
          {
            group: ['three/*', '**/render/*', '**/render/**'],
            message: 'Core/Sim must not import View layer (D40 · ARCH-16).',
          },
        ],
      },
    ],
    'no-restricted-globals': [
      'error',
      { name: 'window', message: 'Core/Sim must not use DOM globals (D40 · ARCH-16).' },
      { name: 'document', message: 'Core/Sim must not use DOM globals (D40 · ARCH-16).' },
    ],
  },
},
```

Legacy `.eslintrc.js` equivalent (reference only — **do not** use in poc3):

```json
{
  "overrides": [
    {
      "files": ["src/core/**/*.ts", "src/systems/**/*.ts", "src/gameobjects/**/*.ts"],
      "rules": {
        "no-restricted-imports": ["error", {
          "paths": ["three"],
          "patterns": ["three/*", "**/render/*"]
        }],
        "no-restricted-globals": ["error", "window", "document"]
      }
    }
  ]
}
```

#### CI grep backup (optional)

```bash
# scripts/check-sim-boundary.sh — exit 1 on violation
rg "from ['\"]three" poc3/src/core poc3/src/systems poc3/src/gameobjects && exit 1
rg "from ['\"].*/render/" poc3/src/core poc3/src/systems poc3/src/gameobjects && exit 1
exit 0
```

Wire into `npm run verify` or GitHub Action after Theme 0 scaffold lands.

---

## Decision (`D38`) — DemoHost

tag_g_builds tag_s_builds_demo_host
RESUME: Demo build talks to same-origin DemoHost API for auth, store wallet, and rankings; Itch/Poki/Steam kits unchanged.

| Lock | Rule |
| --- | --- |
| **Scope** | `IKARUS_PLATFORM=demo` only — adapters call `/api/*`; no DemoHost code in itch/poki/steam bundles |
| **Truth** | Server SQLite is source of truth for Demo wallets, ownership, and shared boards |
| **Client cache** | Optional last-known snapshot in **Dexie / IndexedDB** (`D39`) for offline UX; revalidate on boot via `/api` |
| **ACH** | Local always (`D28`) via Dexie; Demo has no remote achievement dashboard |
| **Auth** | Real Google OAuth authorization-code on DemoHost; session = httpOnly cookie; client reads `AuthSession` from `GET /api/me` |
| **Store UI** | Still JS Bridge (`D34`) — no WebSocket |

---

## Decision (`D39`) — Client persistence (per platform)

tag_g_builds tag_s_arch_persist_dexie tag_s_arch_persist_poki_sdk tag_s_arch_persist_steam_fs
RESUME: Each build uses one host-appropriate persist transport — Itch Dexie; Poki SDK cloud; Steam Tauri FS; Demo DemoHost + Dexie cache.

| Lock | Rule |
| --- | --- |
| **Hot path** | No sync disk/IDB/SDK reads inside Core tick or `syncRender()` — queue writes; apply loads at boot / scene gates |
| **Schema** | Same `StoreSaveSnapshot` / RNK / ACH record shapes across all transports — only the wire differs |
| **Forbidden** | `localStorage` as production source of truth; sync `localStorage` writes on the frame loop |
| **Local mirror** | Dexie may mirror ACH / personal RNK bests on web — never overrides host SoT on Poki or Demo |
| **Quota guard** | Dexie adapters catch `QuotaExceededError` (private browsing / disk full) — toast UX, never crash render loop (`ARCH-12`) |
| **Debounce** | Frequent writes (Dexie · DemoHost API · Tauri FS) batch via **Debounce Manager** — ~3s coalesce, flush on scene destroy / `beforeunload` (`ARCH-13`) |

### Per-host matrix (locked)

| Build | SDK / library | Persist method | Source of truth |
| --- | --- | --- | --- |
| **Itch** | **Dexie.js** (IndexedDB) | Async table read/write | Browser IndexedDB — no itch cloud SDK |
| **Poki** | **Poki SDK** (`window.PokiSDK`) | `gameplayDataSave(data)` · `gameplayDataLoad()` | Poki player profile cloud |
| **Demo** | DemoHost API + Dexie cache | `/api/store/*` · `/api/rankings/*` | SQLite on VPS; Dexie = offline cache only |
| **Steam** | **Tauri** `@tauri-apps/plugin-fs` | Physical `.json` under `BaseDirectory.AppConfig` | Disk files registered for **Steam Cloud** |
| **Local** (ACH / tests) | Dexie.js | IndexedDB tables | Dev/offline; mirrors on web builds |

### Why not `localStorage` on web

Itch and Poki run inside **strict iframes**. Safari and Firefox may block or throw on `localStorage` in embedded contexts. **IndexedDB via Dexie** (Itch) and **Poki SDK cloud APIs** (Poki) are async and do not block the Canvas frame loop.

### Poki SDK (HTML5 embed)

| Topic | Spec |
| --- | --- |
| **Load** | Host injects SDK — `<script>` in `index.html` and/or npm package when available; only referenced inside `Poki*Adapter` modules |
| **Save** | `PokiSDK.gameplayDataSave(serializedSnapshot)` after successful Manager commit |
| **Load** | `PokiSDK.gameplayDataLoad()` at boot → hydrate adapters |
| **Scope** | Store snapshot + profile-bound meta; score upload still uses Poki ranking SDK paths in `PokiRankingAdapter` |
| **Ads / pause** | Existing Poki lifecycle hooks (`commercialBreak`, etc.) — unchanged from `STR-11` |

### Itch.io (HTML5 iframe)

| Topic | Spec |
| --- | --- |
| **SDK** | **None** required for cloud save |
| **Library** | **Dexie.js** wraps IndexedDB |
| **Why** | Reliable inside itch iframe; no silent storage failures |

### Steam (desktop)

| Topic | Spec |
| --- | --- |
| **Shell** | **Tauri** packages the Vite `dist-steam/` bundle (~10MB target; low RAM vs Electron) |
| **FS API** | `@tauri-apps/plugin-fs` — write/read `.json` under `BaseDirectory.AppConfig` |
| **Cloud** | Steamworks registers the same folder/files for **Steam Cloud** sync across PCs |
| **Fallback** | Electron only if a Steamworks plugin blocks Tauri (`Q35`) |

```text
Client Layer               Transport / Adapter                     Source of Truth
──────────────            ───────────────────────                 ────────────────────
[Itch]  ────► StoreSave ─► Dexie.js (Async IDB)  ────────────────► Browser IndexedDB
                                                                      (Quota Guard)

[Poki]  ────► StoreSave ─► PokiSDK.gameplayData  ────────────────► Poki Cloud Profile

[Demo]  ────► StoreSave ─► DemoStoreAdapter      ──► [Zod Schema] ──► SQLite (VPS)
                                 │                      ▲
                                 └── (Offline Failover) └──► Dexie Cache

[Steam] ────► StoreSave ─► Tauri plugin-fs       ────────────────► AppConfig/*.json
                                 (Debounce ~3s)                         │
                                                                       └──► Steam Cloud Sync
```

All transports share **Debounce Manager** coalescing (max ~1 write / 3s) with forced flush on scene teardown / `beforeunload`.

---

## Client stack (`poc3/`)

tag_g_builds tag_s_arch_stack
RESUME: TypeScript + Vite + Three.js + Vitest + Dexie — one core, four build scripts.

| Layer | Choice |
| --- | --- |
| Language | TypeScript (strict) |
| Bundler | **Vite** — `build:demo` · `build:itch` · `build:poki` · `build:steam` via `IKARUS_PLATFORM` |
| Engine | **Three.js** — shared WebGL canvas (`D23`) |
| Local persist | **Dexie.js** (Itch / Local mirrors) · **Poki SDK** (Poki cloud) · **Tauri plugin-fs** (Steam) — `D39` |
| Tests | **Vitest** + jsdom; `npm run verify` = typecheck + lint + test |
| Lint | ESLint + typescript-eslint |
| Platform | `src/platform/kit-demo.ts` · `kit-itch.ts` · `kit-poki.ts` · `kit-steam.ts` + `PlatformKit` (`D37`) |
| Store chrome | HTML shell + `StoreUIBridge` (`D34`) |

### Suggested folder tree

```text
poc3/
  src/
    core/              # Sim — GameLoop, commands, events, WorldSnapshot (NO three/DOM)
    systems/           # *Manager sim logic — updateSim(tick)
    gameobjects/       # Sim entity state
    scenes/            # Scene lifecycle bridge (mount View, subscribe Core)
    ui/                # DOM shell / store bridge
    pools/             # Sim object pools
    render/            # View — Three.js syncRender, VFX mesh pools
    platform/
    persist/
```

Dev rail / Balancer / debug camera compile out when `import.meta.env.PROD` (`BLD-05`).

---

## DemoHost (`demo-host/`)

tag_g_builds tag_s_builds_demo_host tag_s_arch_demohost_api
RESUME: Sibling Node package — serves `dist-demo/` and `/api`; Caddy terminates TLS.

Separate package so Itch/Poki/Steam never import server code.

| Layer | Choice |
| --- | --- |
| Runtime | **Node.js** + TypeScript |
| HTTP | **Hono** — static `../poc3/dist-demo` + `/api`; **Zod** schema validation; rate-limit middleware |
| DB | **SQLite** (single file on VPS) — users, sessions, wallets/BUD, ownership, 8 RNK boards |
| Edge | **Caddy** — automatic HTTPS; reverse-proxy to `localhost:NODE_PORT`; Origin guard on mutating routes |
| Backup | **Litestream** (preferred) or daily `.backup` cron → S3/R2 (`Q33`) |
| Secrets | VPS env only: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` — never in client bundle |

```text
Browser
  │
  ▼
Caddy (TLS)  demo.example.com
  │  /  and /api/*
  ▼
Node DemoHost (Hono)
  ├─ static → poc3/dist-demo/
  └─ /api/* → SQLite + Google token verify
```

### API surface (v1)

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/api/auth/google/start` | Redirect to Google consent (or return auth URL) |
| `GET` | `/api/auth/google/callback` | Code exchange → set session cookie → redirect to game |
| `GET` | `/api/me` | Current `AuthSession` (or 401) |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/store/snapshot` | Load `StoreSaveSnapshot` for user |
| `PUT` | `/api/store/snapshot` | Persist snapshot — **Zod-validated** schema only (`S7`/`ARCH-11`) |
| `POST` | `/api/rankings/submit` | Submit run — integrity-checked payload (`S8`); rate-limited (`Q34`) |
| `GET` | `/api/rankings/board` | Fetch board rows (`mode` + `period` query) |

Session cookie: `Secure` + `HttpOnly` + `SameSite=Lax` (or `Strict` when OAuth flow allows — `S6`).

Mutating routes also require valid **Origin/Referer** matching the demo domain (`S6`/`ARCH-14`).

### Adapters (Demo kit)

| Manager | Adapter | Transport |
| --- | --- | --- |
| `StoreManager` | `DemoStoreAdapter` | `/api/store/*` (+ Dexie offline cache) |
| `RankingManager` | `DemoRankingAdapter` | `/api/rankings/*` (+ Dexie Local mirror of personal bests) |
| `AchievementManager` | Local only | Dexie (`D39`) |

`LocalStoreAdapter` / `LocalRankingAdapter` use **Dexie** for offline unit tests and web mirrors — they are **not** the production Demo source of truth (`D38`).

---

## Four builds (shape)

tag_g_builds tag_s_builds_matrix
RESUME: Same PlatformKit matrix as builds.spec — Demo uses DemoHost adapters.

| Output | Artifact | Store / RNK | Host |
| --- | --- | --- | --- |
| `demo` | `dist-demo/` + `demo-host` | `DemoStoreAdapter` · `DemoRankingAdapter` | Personal VPS |
| `itch` | `dist-itch/` zip | Itch adapters + **Dexie** | itch.io iframe |
| `poki` | `dist-poki/` | Poki adapters + **Poki SDK** cloud save | Poki embed |
| `steam` | `dist-steam/` + **Tauri** shell | Steam adapters + **plugin-fs** JSON | Steam |

Bundle audit (`BLD-03`): web builds must not contain Steam SDK strings.

---

## Deploy

tag_g_builds tag_s_arch_deploy
RESUME: Manual rsync first; GitHub Action SSH later.

### Now (manual)

1. `npm run build:demo` in `poc3/` → `dist-demo/`
2. Build/start `demo-host` on VPS (or rsync package + `npm ci --omit=dev`)
3. Rsync `dist-demo/` to the path DemoHost serves
4. Restart Node (systemd or pm2) behind Caddy
5. Enable **Litestream** (or cron `.backup`) → S3/R2 bucket (`Q33`/`ARCH-15` defer)

### Later (CI)

GitHub Action on tag / `main`: build → SSH/rsync → restart unit.

### Caddy (sketch)

```caddyfile
demo.example.com {
  reverse_proxy localhost:8787
}
```

Node listens on `8787` (or `NODE_PORT`); Caddy owns 443.

---

## Security rules

tag_g_builds tag_s_builds_demo_host tag_s_arch_demohost_security
RESUME: DemoHost security — secrets, session, CSRF, schema validation, ranking integrity.

| # | Rule |
| --- | --- |
| S1 | Client never embeds `GOOGLE_CLIENT_SECRET` or `SESSION_SECRET` |
| S2 | All mutating `/api/store` and `/api/rankings` require valid session |
| S3 | Username/password Login path stays **mock** (`D19`) — Demo production auth is Google |
| S4 | CORS not required for same-origin Demo; reject cross-origin API if misconfigured |
| S5 | SQLite file permissions restricted to the DemoHost service user |
| S6 | **CSRF:** httpOnly cookies use `SameSite=Lax` (or `Strict` when compatible). Mutating routes (`PUT /api/store/snapshot`, `POST /api/rankings/submit`) validate **Origin/Referer** against the demo domain — reject with **403** when missing/invalid (`ARCH-14`) |
| S7 | **Snapshot sanitization:** `PUT /api/store/snapshot` validates `StoreSaveSnapshot` via **Zod** (or TypeBox) on the server **before** SQLite commit. Never persist arbitrary JSON blobs from the client (`ARCH-11`) |
| S8 | **Ranking integrity (`D38`):** `POST /api/rankings/submit` requires a verifiable run payload — bounded `score`/`durationMs`/`kills`, ISO `endedAt`, `buildVersion`, and session-bound integrity token (HMAC or server-stored run nonce). Reject blind REST tampering (`ARCH-11` ranking path) |

---

## Requirements (`ARCH-`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `ARCH-01` | must | Client stack is Vite + TS + Three + Vitest in `poc3/` | Theme 0 scaffold matches this file |
| `ARCH-02` | must | DemoHost is a sibling `demo-host/` package | Itch/Poki/Steam builds do not import it |
| `ARCH-03` | must | Caddy terminates TLS; Node serves static + `/api` | Cold HTTPS boot reaches Login |
| `ARCH-04` | must | Demo kit uses `DemoStoreAdapter` + `DemoRankingAdapter` | Calls hit `/api`; SQLite persists across browsers |
| `ARCH-05` | must | Google OAuth real on Demo | Callback sets cookie; `/api/me` returns session |
| `ARCH-06` | should | Manual deploy docs match rsync + restart | Operator can ship without CI |
| `ARCH-07` | defer | GitHub Action deploy | After Theme 13 packaging stabilizes |
| `ARCH-08` | must | Itch + Local mirrors use Dexie.js (IndexedDB) | No `localStorage` SoT; iframe-safe |
| `ARCH-09` | must | Steam persist = Tauri `plugin-fs` JSON + Steam Cloud | Files under `BaseDirectory.AppConfig` |
| `ARCH-10` | must | Poki persist uses Poki SDK cloud APIs | `gameplayDataSave` / `gameplayDataLoad` on profile snapshot |
| `ARCH-11` | must | Schema + ranking validation on DemoHost | Invalid store → **400**; invalid/tampered ranking → **400/403**; DB never corrupted |
| `ARCH-12` | should | Safe Dexie quota fallback (`D39`) | `QuotaExceededError` → UI toast; render loop continues |
| `ARCH-13` | must | Debounced persist writes on all adapters | Coalesce ~3s; forced flush on scene destroy / `beforeunload` |
| `ARCH-14` | should | Caddy + DemoHost CSRF / Origin guard | Mutating requests without valid Origin → **403** |
| `ARCH-15` | defer | Litestream SQLite backup to S3/R2 | WAL streaming or daily `.backup` cron documented in deploy |
| `ARCH-16` | must | Core / Sim has zero Three.js or DOM imports | ESLint `no-restricted-imports`/`globals` on sim globs; verify fails |
| `ARCH-17` | must | Fixed-tick Core decoupled from rAF View (`D40`) | Sim at 60 Hz constant `SIM_DT`; View reads snapshot on rAF |
| `ARCH-18` | must | Unidirectional Command → Event/Snapshot flow | Input sends Commands; View never mutates sim state |
| `ARCH-19` | should | Sim unit tests run without WebGL/jsdom Three | Core tests green with pure TS only |
| `ARCH-20` | must | Golden Rule guardrails in `npm run verify` | `eslint.config.js` sim snippet merged; lint red on `three` in `core/` |

---

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q05 | Google OAuth client / redirect URI | **Demo domain** callback on DemoHost (`/api/auth/google/callback`) |
| Q06 | Persist auth across reload | **httpOnly session cookie** + `GET /api/me`; optional Dexie cache of display name only |
| Q33 | SQLite backup cadence | **Litestream** WAL → S3/R2 (preferred); fallback daily `.backup` cron on VPS |
| Q34 | Rate-limit ranking submit | **Hono rate-limit middleware** — **1 submit / 10s** per session token (in-memory token bucket OK v1) |
| Q35 | Steam shell | **Tauri** + `@tauri-apps/plugin-fs`; Electron only if Steamworks blocks Tauri |

---

## Document map

| Path | Role |
| --- | --- |
| This file | Architecture / tech stack / DemoHost / persist (`D38`/`D39`, `ARCH-*`) |
| [`builds.spec.MD`](./builds.spec.MD) | Four outputs, PlatformKit, artifacts (`D37`, `BLD-*`) |
| [`store.spec.MD`](./store.spec.MD) | Store adapters including DemoHost |
| [`rankings.spec.MD`](./rankings.spec.MD) | Ranking adapters including DemoHost |
| [`../todo.md`](../todo.md) | Theme 0 scaffold · 0b Login · 13 packaging |
