# Ikarus Eternal Horizon — Production Builds (4 outputs)

tag_g_builds tag_s_builds_matrix tag_s_builds_platform_wire
RESUME: Four production outputs — Demo · Itch · Poki · Steam — one shared core; build-time `IKARUS_PLATFORM` injects matching adapter sets for Store · Achievements · Rankings. Demo uses DemoHost (`D38`).

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.10

**Related:** [`architecture.spec.MD`](./architecture.spec.MD) (`D38`/`D39`) · [`login.spec.MD`](./login.spec.MD) (`D41`) · [`store.spec.MD`](./store.spec.MD) (`D36`) · [`achievements.spec.MD`](./achievements.spec.MD) (`D28`) · [`rankings.spec.MD`](./rankings.spec.MD) (`D30`) · [`nomenclature.spec.MD`](./nomenclature.spec.MD)

---

## Decision (`D37`)

tag_g_builds tag_s_builds_matrix
RESUME: Exactly four shippable products from one `poc3/` codebase — adapters differ; gameplay core does not.

| Lock | Rule |
| --- | --- |
| **Outputs** | `demo` · `itch` · `poki` · `steam` — no fifth production target without a new hub decision |
| **Core** | One TypeScript / Three.js game; managers stay platform-blind |
| **Inject** | `IKARUS_PLATFORM` at **build** time selects adapter modules; boot wires them once |
| **Tree-shake** | Steamworks / CEF never enter web (Demo/Itch/Poki) bundles |
| **Local mirror** | ACH always keeps Local write via Dexie (`D28`/`D39`); Store/RNK Demo → DemoHost (`D38`); Itch → Dexie; Poki store → Poki SDK cloud; Steam → Tauri FS |

---

## Shared vs per-build

tag_g_builds tag_s_builds_pipeline
RESUME: What every build ships vs what each host replaces.

| Layer | All four builds | Per build |
| --- | --- | --- |
| Gameplay managers | Same (`PlayerManager`, `DamageManager`, …) | — |
| Canvas scenes (`D23`) | Start → Title → Run → Result → Rankings → Pause | — |
| Login HTML + `LoginUIBridge` (`D41`) | Same DOM contract | OAuth / session via auth adapter |
| Store HTML + `StoreUIBridge` (`D34`) | Same DOM contract | Persist / ads / overlay via store adapter |
| `BALANCE` catalog | Same shape | Optional host tweaks via env overlays only if documented |
| Achievements / Rankings API names | Same `ACH_*` / `LB_*` | Platform publish adapter |
| Dev rail / Balancer (Pause) | **Compiled out** of production (`import.meta.env.PROD`) | — |
| **`/dev/*` content CRUD** (`D43`) | **Compiled out** of production | DevContentManager + Dexie dev store |
| Debug camera | **Out** of production | — |

---

## Boot wire (all builds)

tag_g_builds tag_s_builds_platform_wire
RESUME: Single boot composition — create managers, inject adapter families from the build’s platform kit.

```text
bootstrap(platformKit)
  ├─ AuthManager.setPlatformAdapter(platformKit.auth)
  ├─ LoginUIBridge.bind(#login-root)                                 // hide when session ok
  ├─ AchievementManager.setPublishAdapter(platformKit.achievements)  // + Local always
  ├─ RankingManager.setPlatformAdapter(platformKit.rankings)         // + Local always mirrors
  ├─ StoreManager.setPlatformAdapter(platformKit.store)
  ├─ LoginStreakManager.setPersistence(platformKit.store)            // same save snapshot
  └─ mount canvas scenes + StoreUIBridge
```

```typescript
// Build-time kit (sketch) — only ONE kit module is imported per output
interface PlatformKit {
  readonly platform: 'demo' | 'itch' | 'poki' | 'steam';
  readonly auth: AuthPlatformAdapter;
  readonly achievements: AchievementPublishAdapter; // or Local-only
  readonly rankings: RankingPlatformAdapter;
  readonly store: StorePlatformAdapter;
}
```

Factory files (suggested layout in `poc3/`):

```text
src/platform/
  types.ts
  kit-demo.ts      // DemoAuth · Local ACH · Demo RNK · DemoStore (DemoHost /api)
  kit-itch.ts
  kit-poki.ts
  kit-steam.ts
  index.ts         // re-exports kit selected by IKARUS_PLATFORM
```

DemoHost package (sibling, not bundled into itch/poki/steam):

```text
demo-host/         // Node + Hono + SQLite — see architecture.spec.MD
```

---

## Production matrix

tag_g_builds tag_s_builds_matrix tag_s_builds_artifacts
RESUME: Host, artifact, adapters, persist, and host-specific extras for each of the four outputs.

### Master table

| | **Demo** | **Itch.io** | **Poki** | **Steam** |
| --- | --- | --- | --- | --- |
| **Id** | `demo` | `itch` | `poki` | `steam` |
| **Host** | Personal VPS — Caddy → Node DemoHost (`D38`) | itch.io web or desktop wrap | Poki Games embed | Steam PC desktop |
| **Runtime** | Browser (HTTPS same-origin `/` + `/api`) | Browser / itch iframe | Browser iframe + Poki SDK | **Tauri** webview + native (`D39`/`Q35`) |
| **Artifact** | Static `dist-demo/` + `demo-host/` | Static `dist-itch/` (zip for itch) | Static `dist-poki/` | `dist-steam/` + Tauri shell + redistributables |
| **Store adapter** | `DemoStoreAdapter` | `ItchStoreAdapter` | `PokiStoreAdapter` | `SteamStoreAdapter` |
| **ACH adapters** | Local only | Local + Itch | Local + Poki | Local + Steam |
| **RNK adapters** | Local mirror + `DemoRankingAdapter` | Local + `ItchRankingAdapter` | Local + `PokiRankingAdapter` | Local + `SteamRankingAdapter` |
| **Persist** | SQLite via `/api` (+ Dexie cache) | **Dexie.js** (IndexedDB) | **Poki SDK** `gameplayDataSave`/`Load` | **Tauri plugin-fs** JSON + Steam Cloud (`D39`) |
| **Ads / IAP** | None | None | Optional rewarded ad → BUD | Soft currency only (IAP later inside adapter) |
| **Overlay** | — | — | — | Pause store CSS on Steam overlay |
| **Dev tools** | Off in prod | Off | Off | Off |
| **npm script (target)** | `build:demo` | `build:itch` | `build:poki` | `build:steam` |

### 1. Demo — self-host (DemoHost)

tag_s_builds_demo tag_s_builds_demo_host tag_s_store_adapter_demo

| Topic | Spec |
| --- | --- |
| **Purpose** | Public / studio demo on personal VPS; shared wallets + boards |
| **Edge** | **Caddy** TLS → **Node** serves `dist-demo/` + `/api` ([`architecture.spec.MD`](./architecture.spec.MD)) |
| **URL** | Relative asset paths under HTTPS origin (`BLD-06`); not `file://` for production Demo |
| **Store** | Soft BUD shop + streak; `DemoStoreAdapter` → `/api/store/*` |
| **ACH / RNK** | `LocalAchievementAdapter` · Local RNK mirror + `DemoRankingAdapter` → `/api/rankings/*` |
| **Auth** | Real Google OAuth via DemoHost (`D38`, `SCENE-01`) |
| **QA gate** | Cold HTTPS boot → Google Login → Title → Store claim streak → buy with BUD → reload on second browser survives |

### 2. Itch.io

tag_s_builds_itch tag_s_store_adapter_itch

| Topic | Spec |
| --- | --- |
| **Purpose** | itch.io page embed and/or downloadable HTML5 |
| **Package** | Zip of `dist-itch/` per itch HTML5 upload rules |
| **Store** | Soft BUD shop + streak; `ItchStoreAdapter` — Dexie persist (`D39`); no Steam Cloud |
| **ACH / RNK** | Local mirror + `ItchAchievementAdapter` · `ItchRankingAdapter` |
| **QA gate** | Embed on itch; unlock one ACH; submit one RNK; store save survives refresh |

### 3. Poki Games

tag_s_builds_poki tag_s_store_adapter_poki

| Topic | Spec |
| --- | --- |
| **Purpose** | Poki HTML5 portal embed |
| **SDK** | **Poki SDK** — host injects via `<script>` and/or npm; only inside Poki adapters |
| **Store** | `PokiStoreAdapter` — persist via **`PokiSDK.gameplayDataSave` / `gameplayDataLoad`** (`D39`) + optional `watchAdForBud` (`STR-11`) |
| **ACH / RNK** | Local Dexie mirror + `PokiAchievementAdapter` · `PokiRankingAdapter` (score upload API) |
| **QA gate** | Poki checklist: cloud save survives browser change; commercial break does not soft-lock; no Steam symbols in bundle |

### 4. Steam

tag_s_builds_steam tag_s_store_adapter_steam

| Topic | Spec |
| --- | --- |
| **Purpose** | Steamworks desktop product |
| **Shell** | **Tauri** packages Vite `dist-steam/` (~10MB target; low RAM) |
| **Store** | `SteamStoreAdapter` — **`@tauri-apps/plugin-fs`** writes `.json` under `AppConfig` + Steam Cloud sync (`D39`) |
| **ACH / RNK** | Disk/local mirror + `SteamAchievementAdapter` · `SteamRankingAdapter` (KeepBest `LB_*`) |
| **QA gate** | Offline play → Cloud sync of save files; overlay during Store; Partner API names match catalog |

---

## Build pipeline (poc3 target)

tag_g_builds tag_s_builds_pipeline tag_s_builds_artifacts
RESUME: Vite (or equivalent) env injection — four npm scripts, four dist folders, one CI matrix.

| Env / define | Values |
| --- | --- |
| `IKARUS_PLATFORM` | `demo` \| `itch` \| `poki` \| `steam` |
| `import.meta.env.PROD` | true in all four production scripts |
| `IKARUS_BUILD_VERSION` | semver string stamped into Result / RNK payload |

Suggested scripts (land with Theme 0 / packaging):

```bash
npm run build:demo    # IKARUS_PLATFORM=demo  → dist-demo/
npm run build:itch    # IKARUS_PLATFORM=itch  → dist-itch/
npm run build:poki    # IKARUS_PLATFORM=poki  → dist-poki/
npm run build:steam   # IKARUS_PLATFORM=steam → dist-steam/ (+ native pack step)
```

| CI check | Rule |
| --- | --- |
| Bundle audit web | Fail if `steamworks` / `SteamAPI` strings appear in demo/itch/poki artifacts |
| Adapter smoke | Unit tests mock each `PlatformKit` |
| `npm run verify` | Shared core tests green before any ship |

---

## Feature flags by build

| Feature | Demo | Itch | Poki | Steam |
| --- | --- | --- | --- | --- |
| Soft Store (BUD) | ✓ (DemoHost) | ✓ | ✓ | ✓ |
| Login streak | ✓ | ✓ | ✓ | ✓ |
| Rewarded ad → BUD | — | — | ✓ optional | — |
| Steam Cloud | — | — | — | ✓ |
| Platform ACH | — | ✓ | ✓ | ✓ |
| Platform RNK boards | DemoHost shared | ✓ | ✓ | ✓ |
| Google OAuth Login | ✓ real (`D38`) | ✓ | ✓ | optional / Steam auth later (`Q30`) |

---

## Requirements (`BLD-`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `BLD-01` | must | Four production outputs from one core | `build:demo|itch|poki|steam` each emit a distinct artifact |
| `BLD-02` | must | `IKARUS_PLATFORM` selects exactly one platform kit | Wrong kit never mixed at runtime |
| `BLD-03` | must | Web builds contain no Steam SDK | Bundle audit / grep gate |
| `BLD-04` | must | Boot wires Auth + ACH + RNK + Store adapters from the same kit | Single `PlatformKit` per boot |
| `BLD-05` | should | Production builds strip Dev rail + DEV debug camera; **Free Cam (`CAM-06`) stays** | No Balancer tab in prod; Graphics Free Cam still present |
| `BLD-06` | should | Demo assets relative under HTTPS origin | Works behind Caddy + DemoHost (`D38`) |
| `BLD-07` | defer | Automated Steam depot upload | Manual Partner upload OK v1 |
| `BLD-08` | must | Demo kit uses DemoHost adapters | `DemoStoreAdapter` + `DemoRankingAdapter` call `/api` |
| `BLD-09` | must | Itch build uses Dexie for persist (`D39`) | Reload inside itch iframe; no `localStorage` SoT |
| `BLD-10` | must | Poki build uses Poki SDK cloud save (`D39`) | `gameplayDataSave`/`Load` round-trip |
| `BLD-11` | must | Steam save files via Tauri `plugin-fs` + Cloud (`D39`) | JSON under `AppConfig`; Cloud path registered |

---

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q30 | Steam uses Steam auth vs Google on Login | Prefer Steam overlay auth when `steam`; Google still for web builds |
| Q31 | Itch desktop vs web-only first | Ship **web HTML5** first; desktop wrap later |
| Q32 | Poki commercial break cadence | Follow Poki SDK docs; numbers not in this hub |

---

## Document map (builds)

| Path | Role |
| --- | --- |
| This file | Production build authority (`D37`, `BLD-*`) |
| [`architecture.spec.MD`](./architecture.spec.MD) | DemoHost stack · Caddy+Node · `D38` · `ARCH-*` |
| [`store.spec.MD`](./store.spec.MD) | Store adapters detail (`D36`/`D38`) |
| [`achievements.spec.MD`](./achievements.spec.MD) | ACH adapters (`D28`) |
| [`rankings.spec.MD`](./rankings.spec.MD) | Ranking adapters detail (`D30`/`D38`) |
| [`../todo.md`](../todo.md) | Theme 13 packaging · Theme 14 adapters |
