# Ikarus Eternal Horizon — Store (Progression Shop)

tag_g_progression tag_s_store_manager tag_s_store_ui_bridge tag_s_login_streak
RESUME: StoreManager + LoginStreakManager — HTML hub shop; BUD wallet; weekly login streak rewards; profile-bound purchases.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.14

**Related:** [`crafting.spec.MD`](./crafting.spec.MD) (inventory / caps) · [`drops.spec.MD`](./drops.spec.MD) (`ResourceId`) · [`login.spec.MD`](./login.spec.MD) (auth before hub) · [`scenes.spec.MD`](./scenes.spec.MD) (Title / hub access) · [`builds.spec.MD`](./builds.spec.MD) (4 production outputs · `D37`) · [`architecture.spec.MD`](./architecture.spec.MD) (`D38` DemoHost · `D39` Dexie/Steam FS) · [`achievements.spec.MD`](./achievements.spec.MD) / [`rankings.spec.MD`](./rankings.spec.MD) (same adapter pattern) · [`nomenclature.spec.MD`](./nomenclature.spec.MD) (`StoreManager`)

---

## Architecture & UI stack

tag_g_progression tag_s_store_ui tag_s_store_ui_bridge
RESUME: Presentation is DOM (HTML/CSS); authority is TypeScript StoreManager via same-document JS Bridge — no WebSocket.

The progression store is a **dedicated HTML/CSS tab** inside the game shell layout (alongside the shared WebGL canvas). Cards, typography, and micro-animations are standard DOM/CSS matching the design system.

| Layer | Technology | Role |
| --- | --- | --- |
| **Presentation** | HTML + CSS (+ minimal TS bindings) | Render listings, apply CSS state classes, play UI transitions |
| **Bridge** | `StoreUIBridge` (same JS realm) | DOM events → `StoreManager`; result codes → CSS/SFX |
| **Authority** | `StoreManager` | Catalog, afford/own, atomic commit — **platform-blind** |
| **Platform** | `StorePlatformAdapter` (`D36`) | Persist / cloud / ads / overlay — **one concrete class per build** |

**`D23` exception (locked):** **Login** (`D41`), **Store** (`D34`), **Result**, and **Rankings** (`D42`) are **DOM shell chrome** — not canvas scenes. **Start · Title · Run · Pause** stay on the shared WebGL canvas. Store is a **Title hub tab**; Login is pre-Start; Result/Rankings are post-run panels. OAuth still uses an external browser tab when required.

### Communication lock (`D34`) — JS Bridge, not WebSocket

| Option | Decision |
| --- | --- |
| **Same-document JS Bridge** | **Locked** — UI calls `StoreManager` / `StoreUIBridge` in-process |
| Local WebSocket | **Rejected** — unnecessary for one process; adds latency and dual state |
| Native plugin IPC | Only if a future desktop host (Electron/Tauri) wraps the same bridge; still no WS for store |

```text
[HTML Store tab] --click listingId--> StoreUIBridge.tryPurchase(listingId)
                                            │
                                            ▼
                                      StoreManager.tryPurchaseItem
                                            │
              InventoryPort · ProfilePort · StorePlatformAdapter (persist)
                                            │
                                            ▼
[HTML Store tab] <--result code----- StoreUIBridge.applyResult(code, listingId)
```

UI layers **never** mutate wallets or grant items. They only read `getListingState` and dispatch `tryPurchaseItem`.

---

## Platform adapters (`D36`) — decision lock

tag_g_progression tag_s_store_platform_adapter tag_s_store_adapter_demo
RESUME: Same pattern as ACH/RNK — StoreManager talks only to StorePlatformAdapter; build injects one concrete adapter (Demo · Itch · Poki · Steam).

### Why this shape (chosen)

| Option | Verdict |
| --- | --- |
| **A. Interface + one concrete adapter per build** (mirror `D28`/`D30`) | **Chosen** — one mental model for ACH · RNK · Store; tree-shake Steam out of web; Demo = DemoHost (`D38`) |
| B. Four separate StoreManagers | Rejected — duplicates catalog/transaction rules |
| C. Runtime WebSocket for Store UI | Rejected — banned by `D34`; UI stays in-process |
| D. Compile-only `#ifdef` scattered in StoreManager | Rejected — leaks SDKs into core; untestable |

**Injection:** build flag `IKARUS_PLATFORM=demo|itch|poki|steam` (Vite `define` / env) selects which adapter **module is bundled**. Boot calls `StoreManager.setPlatformAdapter(adapter)` once — **no mid-session swap**. Full production matrix: [`builds.spec.MD`](./builds.spec.MD) (`D37`). Demo transport: [`architecture.spec.MD`](./architecture.spec.MD) (`D38`).

```text
[Build: Steam] ──► SteamStoreAdapter ──┐
[Build: Poki]  ──► PokiStoreAdapter  ──┤
[Build: Itch]  ──► ItchStoreAdapter  ──┼─► StoreManager (core)
[Build: Demo]  ──► DemoStoreAdapter  ──┘
```

### Port contract (sketch)

```typescript
interface StorePlatformAdapter {
  readonly id: 'demo' | 'local' | 'itch' | 'poki' | 'steam';
  loadPlayerData(): Promise<StoreSaveSnapshot>; // or sync when host is sync-only
  savePlayerData(snapshot: StoreSaveSnapshot): Promise<void>;
  /** Optional — Poki rewarded ads only; others return unsupported */
  watchAdForBud?(amount: number): Promise<'GRANTED' | 'CANCELLED' | 'UNSUPPORTED'>;
  /** Optional — Steam overlay; others no-op */
  onHostOverlay?(active: boolean): void;
  dispose(): void;
}
```

`StoreManager` / `LoginStreakManager` persist **only** through this port (or a thin `PersistencePort` façade wired to it). Core never imports Steamworks, `window.pokiSDK`, or CEF bindings. `id: 'local'` is for unit tests / offline harness — **not** the production Demo kit.

### Adapter matrix (4 builds)

| Build | Adapter | UI chrome | Persist | Extra |
| --- | --- | --- | --- | --- |
| **Demo** (self-host) | `DemoStoreAdapter` | JS Bridge (`D34`) | DemoHost `/api/store/*` → SQLite (`D38`); Dexie offline cache (`D39`) | Real Google session required for mutate |
| **Itch.io** | `ItchStoreAdapter` | JS Bridge | **Dexie.js** (IndexedDB) — iframe-safe; no itch cloud SDK | No cloud lock; no ads |
| **Poki** | `PokiStoreAdapter` | JS Bridge + `window.PokiSDK` | **`PokiSDK.gameplayDataSave` / `gameplayDataLoad`** (`D39`) | Optional `watchAdForBud`; pause loop + mute via `SoundManager` |
| **Steam** | `SteamStoreAdapter` | JS Bridge inside **Tauri** shell | **`@tauri-apps/plugin-fs`** → `.json` in `AppConfig` + Steam Cloud (`D39`) | Overlay → `.ui-paused` on store HTML |

### Rules (locked)

| # | Rule |
| --- | --- |
| R1 | **One** platform adapter active per boot — never Steam imports in a Poki bundle |
| R2 | **Demo = DemoHost** — `DemoStoreAdapter` calls same-origin `/api`; not a fifth commerce product path |
| R3 | Soft-currency shop (BUD / scrap) is **always** validated by `StoreManager`; adapters only persist + optional ad grant |
| R4 | Real-money IAP (if ever) stays **inside** the platform adapter and returns a grant token to `StoreManager` — UI still never talks to SDKs |
| R5 | Poki ads: freeze `GameLoop`, mute via `SoundManager`, on success call profile wallet grant through Manager — adapter does **not** bypass `tryPurchaseItem` / grant APIs |
| R6 | Steam overlay open → CSS `.ui-paused` on `#store-root`; no transaction commit while paused |
| R7 | Same `StoreSaveSnapshot` schema across all adapters — only the transport differs |
| R8 | **Itch** + Local mirrors use **Dexie.js** (`D39`) — not `localStorage` |
| R9 | **Poki** store persist uses **Poki SDK** `gameplayDataSave` / `gameplayDataLoad` — not Dexie as SoT |
| R10 | **Steam** uses **Tauri `plugin-fs`** JSON under `AppConfig` + Steam Cloud (`D39`) |

### Save snapshot (sketch)

```typescript
interface StoreSaveSnapshot {
  version: number;
  wallet: Partial<Record<'bud' | 'metalScrap' | 'prismaticCrystal', number>>;
  unlocks: string[];          // permanentSkin / owned listing ids
  upgradeTiers: Record<string, number>;
  loginStreak: { day: number; lastClaimUtcDay: string }; // YYYY-MM-DD
}
```

---

## Ownership (`D33`)

tag_g_progression tag_s_store_manager
RESUME: StoreManager is the sole validator and executor of virtual purchases and catalog state mapping.

| Owns | Does **not** own |
| --- | --- |
| Store catalog (`BALANCE.store.catalog`) | Core wallet storage bytes (adapter + `ProfilePort` backends) |
| Purchase validation (`canAfford`, ownership) | DOM layout / CSS files / HTML markup authorship beyond contract |
| Transaction commit + result codes | Applying ship Summary grants (equip/CHAR recalc after unlock) |
| Syncing listing state to the bridge | Currency **generation** (drops, stage rewards, **login streak** → `LoginStreakManager`) |
| Which adapter is active (boot wire) | Steam / Poki / Itch SDK call details |
| Dispatch of SUCCESS / fail cues | Mid-run Pause Lab craft ([`crafting.spec.MD`](./crafting.spec.MD)) |

**Trigger:** store UI buttons call `StoreManager.tryPurchaseItem(listingId)` only through the bridge.

---

## Currencies & prices

tag_g_resources tag_s_store_currencies
RESUME: Prices are ResourceId stacks on the profile wallet; **BUD** is the primary soft progression token.

| CurrencyId | Display | Type | Wallet | Context |
| --- | --- | --- | --- | --- |
| `bud` | **BUD** | Pure virtual | **Profile** | Primary in-game progression coin — store + login streak |
| `metalScrap` | Metal Scrap | Material | **Profile** (hub store) | Soft progression — not live run bag mid-combat |
| `prismaticCrystal` | Prismatic Crystal | Material | **Profile** | High-tier unlocks |

| Rule | Detail |
| --- | --- |
| Run bag | Mid-run scrap ([`drops.spec.MD`](./drops.spec.MD) / craft) is **separate** until Result transfers into profile (`Q24`) |
| Multi-cost | A listing may require e.g. `50 bud + 2 prismaticCrystal` |
| Scope | Store spends **profile** wallets only (`Q23` — hub / safe zone) |
| Alias | Docs2 / drafts `credits` → canonical **`bud` / BUD** — do not introduce a second virtual coin |

Canonical material names: [`crafting.spec.MD`](./crafting.spec.MD). **BUD** is meta-only (not a world drop). Streak grants BUD via `LoginStreakManager` (`D35`).

---

## Weekly login streak (`D35`)

tag_g_progression tag_s_login_streak tag_s_login_streak_rewards
RESUME: Seven UTC calendar-day streak — claim once per day after auth; BUD ramps +5 until day 6, day 7 week-close jackpot.

### Reward table (locked feel — numbers also in `BALANCE.loginStreak`)

| Streak day | BUD granted | Note |
| --- | --- | --- |
| **1** | **5** | First login of a new chain |
| **2** | **10** | +5 |
| **3** | **15** | +5 |
| **4** | **20** | +5 |
| **5** | **25** | +5 |
| **6** | **30** | +5 |
| **7** | **60** | Week-close bonus (not 35) |

Week total if unbroken: **5+10+15+20+25+30+60 = 165 BUD**.

### Calendar & reset rules

| Rule | Detail |
| --- | --- |
| Day boundary | **UTC** calendar day (same timezone policy as rankings periods) |
| Claim window | Once per UTC day, after valid `AuthSession` — typically Title/hub shell |
| Advance | Claiming day *N* sets streak to *N*; next successful claim on a **consecutive** UTC day unlocks *N+1* |
| Miss | Any UTC day without a claim **breaks** the chain → next claim is day **1** again |
| After day 7 | Claim resets chain; next day starts at day **1** (new week loop) |
| Double claim | Same UTC day → `ALREADY_CLAIMED`; no second BUD grant |
| Offline / clock skew | Client may propose claim; `LoginStreakManager` validates against last claim timestamp + UTC day index (`Q26`) |

### Ownership

| Owns (`LoginStreakManager`) | Does **not** own |
| --- | --- |
| Streak day index + last claim UTC date | Store catalog / purchases (`StoreManager`) |
| Granting BUD to profile wallet on claim | DOM presentation (bridge/UI shows ladder) |
| Persist streak state via `PersistencePort` | Generating BUD from other sources (achievements, etc.) |

```
onAuthReady()                 // boot / return to hub
getStreakState() → { day: 1..7, canClaim: boolean, nextRewardBud: number }
tryClaimDaily() → CLAIMED | ALREADY_CLAIMED | INVALID
dispose()
```

UI (hub / Title) may show a 7-step ladder; claim button only when `canClaim`. SFX stub: `SND_STREAK_CLAIM`.

---

## Catalog & listing types

tag_g_progression tag_s_store_catalog
RESUME: Static BALANCE listings — consumable vs permanent skin vs ship upgrade tiers.

| Listing type | Behavior | Handoff |
| --- | --- | --- |
| `consumable` | Repeatable; stackable | `inventory.tryAdd(targetId, amount)` (profile or run bag per listing flag) |
| `permanentSkin` | Cap 1; locked once owned | `profile.unlockCosmetic(skinId)` |
| `shipUpgrade` | Linear tiers (1 → 2 → …) | `profile.incrementUpgradeTier(upgradeId)` |

```typescript
// BALANCE.store.catalog[*] entry shape (sketch)
interface StoreListing {
  readonly listingId: string;
  readonly targetId: string;
  readonly type: 'consumable' | 'permanentSkin' | 'shipUpgrade';
  readonly costs: ReadonlyArray<{ readonly id: 'bud' | 'metalScrap' | 'prismaticCrystal'; readonly amount: number }>;
  /** consumable only — where the grant lands */
  readonly grantWallet?: 'profile' | 'run';
}
```

| Rule | Detail |
| --- | --- |
| Uniqueness | Permanent already owned → `OWNED`; UI disables buy via CSS |
| Verification | Re-check snapshot on click (no race with animation) |
| Numbers | Prices only in `BALANCE.store` (`Q22`) |

**Combat power:** permanent skins are **cosmetic**. `shipUpgrade` may raise profile unlock tiers that later feed equip/CHAR on loadout — never a silent runtime cheat mid-run without recalc (`CHAR-05`).

---

## Transaction lifecycle

tag_g_progression tag_s_store_transactions
RESUME: Deterministic check-then-commit; zero heap alloc on the evaluation hot path.

| Step | Rule |
| --- | --- |
| 1. Catalog | Resolve `listingId` from `BALANCE.store.catalog` — abort if missing |
| 2. Ownership | If permanent / max tier → `ALREADY_OWNED` |
| 3. Cost | Every `costs[]` entry: `wallet.getCount(id) >= amount` |
| 4. Space | If consumable → `hasSpaceFor(targetId, amount)` (`RES-05`) |
| 5. Commit | Deduct **all** costs → grant payload → `PersistencePort` save |
| 6. Feedback | Bridge gets `SUCCESS` \| `INSUFFICIENT_FUNDS` \| `ALREADY_OWNED` \| `NO_SPACE` \| `INVALID` |

---

## `StoreManager` contract (sketch)

tag_s_store_manager

```
initialize(catalogData)
setPlatformAdapter(adapter)   // boot only — D36
getListingState(listingId) → AVAILABLE | OWNED | LOCKED | UNAFFORDABLE
tryPurchaseItem(listingId) → TransactionResultCode
canAfford(listingId) → boolean
syncUIState()                 // push all listing states to bridge
dispose()
```

Ports: `InventoryPort` · `ProfilePort` · `StorePlatformAdapter` · `UIEventDispatcherPort` (bridge).

---

## Feedback, audio & CSS states

tag_g_audio tag_s_audio_cue_dispatch tag_s_store_ui
RESUME: Distinct CSS + SFX hooks for afford / own / success / fail.

| Case | DOM / CSS | SFX |
| --- | --- | --- |
| Available | Buy button + price layout | — |
| Locked / Owned | `pointer-events: none`; label OWNED / LOCKED | — |
| Unaffordable | Modifier class on price (error/red theme) | — |
| Success | Brief flash transition on card | `SND_STORE_BUY_SUCCESS` |
| Fail (funds) | Shake keyframe on card | `SND_STORE_BUY_FAIL` |
| Streak claim | Ladder step highlight | `SND_STREAK_CLAIM` |

---

## HTML / CSS structure (sketch)

tag_s_store_ui

Minimal shell — Game Design owns final visual system; this is the structural contract:

```html
<section id="store-root" class="store" data-store-tab hidden>
  <header class="store__header">
    <h1 class="store__title">Store</h1>
    <ul class="store__wallet" data-wallet></ul>
  </header>
  <div class="store__grid" data-listings></div>
</section>
```

```html
<!-- one card template -->
<article class="store-card" data-listing-id="…" data-state="available|owned|locked|unaffordable">
  <h2 class="store-card__name"></h2>
  <ul class="store-card__costs"></ul>
  <button type="button" class="store-card__buy" data-action="buy">Buy</button>
</article>
```

| CSS hook | Meaning |
| --- | --- |
| `.store-card[data-state="owned"]` | Disable buy; show OWNED |
| `.store-card[data-state="unaffordable"]` | Error theme on costs |
| `.store-card.is-flash` | Success flash |
| `.store-card.is-shake` | Fail shake (`ui_shake_duration`) |

Bridge binds `[data-action="buy"]` → `tryPurchaseItem`; never writes wallet DOM from guessed math — only from port snapshots after commit.

Streak ladder (hub chrome, may sit above Store tab):

```html
<aside class="streak" data-streak>
  <ol class="streak__days"><!-- 7 steps; data-day="1..7" data-state="done|current|locked" --></ol>
  <button type="button" class="streak__claim" data-action="claim-streak">Claim</button>
</aside>
```

---

## Access rules

| Rule | Detail |
| --- | --- |
| Where | **Title / hub** safe zone only (`Q23`) |
| Mid-run | Store **disabled** during Run / Pause combat loop |
| Survivor | Same hub store; Survivor run still cannot open store mid-run |
| Streak claim | Hub / Title after auth — not mid-run |

---

## Requirements (`STR-`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `STR-01` | must | Catalog from static `BALANCE.store.catalog` | Bridge builds listing cards from catalog |
| `STR-02` | must | Atomic multi-currency check | Missing any cost stack → fail, no partial deduct |
| `STR-03` | must | No duplicate permanent unlocks | Owned skins blocked across sessions |
| `STR-04` | should | Capacity gate for consumables | Cap blocks sale (`RES-05`) |
| `STR-05` | defer | Dynamic discounts / coupons | Temporary modifiers in `canAfford` |
| `STR-06` | must | JS Bridge only (no WS) | UI mutations go through `StoreUIBridge` → `StoreManager` |
| `STR-07` | must | Weekly login streak grants BUD per table | Day 1→5 … day 6→30 · day 7→60; miss resets |
| `STR-08` | must | One claim per UTC calendar day | Second claim same day → `ALREADY_CLAIMED` |
| `STR-09` | should | Streak ladder UI in hub | Shows current day + next reward; claim when eligible |
| `STR-10` | must | One `StorePlatformAdapter` per build (`D36`/`D38`) | Demo=`DemoStoreAdapter`; Steam SDK absent from Poki/Itch/Demo bundles |
| `STR-11` | should | Poki `watchAdForBud` optional path | Unsupported on Demo/Itch/Steam; grants only via Manager |
| `STR-12` | should | Steam overlay pauses store CSS | `.ui-paused` while overlay active |
| `STR-13` | must | Demo store persist via DemoHost `/api` | Snapshot survives across browsers for same Google user |
| `STR-14` | must | Itch store adapter persists via Dexie (`D39`) | Reload restores snapshot inside itch iframe |
| `STR-15` | must | Poki store adapter uses Poki SDK cloud save (`D39`) | `gameplayDataSave`/`Load` round-trip profile snapshot |
| `STR-16` | must | Steam store adapter writes Tauri FS JSON + Cloud | File under `AppConfig`; Cloud path registered |

---

## BALANCE keys (Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `catalog` | `StoreListing[]` |
| `ui_shake_duration` | Fail shake length (ms) |
| `allow_run_debt` | DEV bypass for cost checks |
| `loginStreak.rewards` | `[5,10,15,20,25,30,60]` BUD by day index 1–7 |
| `loginStreak.timezone` | `UTC` (locked with rankings) |

---

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q22 | Profile persist timing | Auto-save via `PersistencePort` on successful commit / streak claim |
| Q23 | Store during active run | **Off** — Title/hub only |
| Q24 | When run scrap → profile wallet | On Result accept (transfer surplus); tune later |
| Q25 | Full HTML visual system vs stub cards | Stub cards Theme 14; polish with packaging |
| Q26 | Anti-clock-skew for streak | Client propose + server/local day index; reject if lastClaim same UTC day |
| Q27 | Streak UI on Login vs Title | **Title/hub** after auth |
| Q28 | Steam Cloud conflict resolve | Last-write-wins with local timestamp; refine if needed |
| Q29 | Poki ad BUD amount | Single BALANCE.store.adBudReward stub |
