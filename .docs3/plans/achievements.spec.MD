# Ikarus Eternal Horizon — Achievements — Publish Adapters

tag_g_achievements tag_s_achievements_virtual_api tag_s_achievements_local_adapter
RESUME: Gameplay unlocks by stable apiName; Local always; one platform adapter per boot (Itch · Poki · Steam).

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.10

Satellite: [`../../.docs2/plans-later/achievements-plan.spec.MD`](../../.docs2/plans-later/achievements-plan.spec.MD)

---

## Publish adapters (`ACH-01`, `D28`)

tag_g_achievements tag_s_achievements_virtual_api tag_s_achievements_local_adapter
RESUME: Gameplay unlocks by stable apiName only; persistence goes through Local plus one host platform adapter (Itch · Poki · Steam).

Run systems and UI call **only** the **`AchievementManager` publish port** — never Steamworks, Poki SDK, or Itch APIs directly. Platform SDKs live inside **publish adapters** selected at boot from the host/build.

#### Virtual vocabulary (locked)

| Call | Rule |
| --- | --- |
| `unlock(apiName)` | Mark achievement unlocked in memory |
| `setStat(statId, value)` | Update progress counter |
| `isUnlocked(apiName)` | Read flag |
| `getStat(statId)` | Read counter |
| `flush()` | Persist + notify platform (rate-limited where applicable) |
| `indicateProgress(apiName, cur, max)` | Optional UI toast — sparse events only |

`apiName` = catalog string (`ACH_{AREA}_{DETAIL}`). **Same names** on Local, Itch, Poki, and Steam registrations.

#### Publish adapters

| Adapter | Host / build | Role |
| --- | --- | --- |
| **`LocalAchievementAdapter`** | Always (dev, offline, fallback) | **Dexie.js** (IndexedDB) mirror (`D39`); source of truth when no platform SDK |
| **`ItchAchievementAdapter`** | itch.io embed or hosted web build | Maps `apiName` → Itch achievements API when host is Itch |
| **`PokiAchievementAdapter`** | Poki Games embed | Maps `apiName` → Poki SDK achievement calls |
| **`SteamAchievementAdapter`** | Steam PC build | Steamworks `SetAchievement` / `SetStat` / `StoreStats` |

**Boot rule (`D28`):** detect host/build → pick **one platform adapter** (or **Local-only** when no SDK). **Local adapter always runs** — every `unlock` / `setStat` writes Local first, then forwards to the platform adapter when active.

**Flush rule:** run end · death · major events (Boss General, first Mega) · app exit. **Never** per frame, shot, or pickup. Steam `StoreStats` stays buffered (minutes-scale rate limit).

#### `AchievementManager` contract (sketch)

```
// Tracker observes run events → evaluates catalog conditions
unlock(apiName) / setStat(id, value)  // virtual API
flush()
setPublishAdapter(local | itch | poki | steam)  // boot only
dispose()
```

`AchievementCatalog` stays static data in `BALANCE`. Gameplay never imports platform SDKs.

#### Acceptance (hub-level)

- Dev / file build: Local-only — unlock survives reload.
- Itch build: same `apiName` unlock appears in Itch dashboard when API wired.
- Poki embed: unlock forwards through Poki adapter without Steam imports in gameplay code.
- Steam build: overlay notification after buffered `StoreStats`; no unlock spam during combat.

## Requirements & catalog (`ACH-`)

**Design detail:** publish adapters section above · decision `D28`

tag_g_achievements tag_s_achievements_catalog tag_s_achievements_local_adapter
RESUME: Stable apiName catalog, run tracker, Local persistence, and host platform publish adapters (Itch · Poki · Steam).

Source satellite (coverage only): `[../../.docs2/plans-later/achievements-plan.spec.MD](../../.docs2/plans-later/achievements-plan.spec.MD)`. **This hub wins** on adapter model (`D28`) and naming (`Tanker`, DRIFTING/integrity states).

**Phase:** Local + catalog in **Theme 14**; Itch/Poki with web ports; Steam with PC packaging.

#### Model

| Concept | Rule |
| --- | --- |
| **Achievement** | Boolean flag; never re-lock in production |
| **API Name** | Stable string — identical in catalog, Local storage, Itch, Poki, and Steam Partner |
| **Progress stat** | Optional counter; auto-unlock at threshold |
| **Combat power** | Achievements **never** grant stat/equip power |
| **Publish** | publish adapters section above — `AchievementManager` + **Local** + one platform adapter per boot |

#### Runtime modules

| Piece | Role |
| --- | --- |
| `AchievementCatalog` | Static list in `BALANCE` — apiName, type, threshold, hidden, gate |
| `AchievementManager` | Run event tracker → virtual `unlock` / `setStat` / `flush`; owns active platform adapter |
| `LocalAchievementAdapter` | **Always on** — offline cache and dev default |
| `ItchAchievementAdapter` | itch.io host |
| `PokiAchievementAdapter` | Poki Games embed |
| `SteamAchievementAdapter` | Steamworks PC build |

**Flush on:** run end / death · major events · app exit. **Never** per frame, shot, or pickup.

Suggested stats: `STAT_TOTAL_KILLS`, `STAT_BEST_SCORE`, `STAT_RUNS`, `STAT_MEGA_KILLS`, `STAT_CRAFTS`, `STAT_SURVIVOR_RUNS`.

#### Initial catalog (26 — trim to 15–30 after playtest)

| API Name | Display (EN) | Condition | Hidden |
| --- | --- | --- | --- |
| `ACH_FIRST_BLOOD` | First Blood | Destroy first enemy | No |
| `ACH_RUN_START` | Ignition | Complete first run (any outcome) | No |
| `ACH_KILL_50` | Squadron Breaker | 50 kills in one run | No |
| `ACH_KILL_100` | Hundred Mark | 100 kills in one run | No |
| `ACH_KILL_500` | Eternal Horizon | 500 kills in one run | No |
| `ACH_KILL_1000` | Sector Nightmare | 1000 kills in one run | No |
| `ACH_TOTAL_KILLS_1000` | Wreckage Trail | 1000 kills lifetime | No |
| `ACH_SCORE_100K` | Neon Score | Score ≥ 100000 in one run | No |
| `ACH_MEGA_KILL` | Horizon Splitter | Destroy a Mega Asteroid | No |
| `ACH_MINIBOSS_ANY` | Escort Denied | Defeat any MiniBoss | No |
| `ACH_MINIBOSS_ALL` | Trio Down | Defeat all three MiniBoss types | No |
| `ACH_BOSS_GENERAL` | General Shutdown | Complete Boss General event | No |
| `ACH_BOSS_NO_HIT` | Untouchable Command | Boss General without taking damage | Yes |
| `ACH_TANKER_50` | Hull Breaker | Destroy 50 **Tankers** | No |
| `ACH_WARRIOR_50` | Fire Suppressor | Destroy 50 Warriors | No |
| `ACH_ROGUE_50` | Ghost Hunter | Destroy 50 Rogues | No |
| `ACH_WEAPON_LASER` | Redline | Fire Laser in combat | No |
| `ACH_WEAPON_ALL_ONE_RUN` | Full Battery | Use Laser, Plasma, Beam, Mjolnir in one run | No |
| `ACH_SPECIAL_NOVA` | Pulse Cleared | Use Pulse Nova once | No |
| `ACH_SPECIAL_ALL` | Ordnance Master | Use all three Special Ordnance | No |
| `ACH_FIRST_REPAIR` | Field Patch | Complete one repair craft (Metal Scrap) | No |
| `ACH_CRAFT_10` | Shipyard Cadet | Complete 10 crafts | No |
| `ACH_SHIELD_BREAK` | Glass Cockpit | Survive 30s with shield at 0 | No |
| `ACH_HULL_CRITICAL` | Holding Together | Destroy 10 enemies while **SEVERE** or **DRIFTING** (`CHAR-04`) | Yes |
| `ACH_SURVIVOR_FIRST` | Cold Start | Complete a Survivor run | No |
| `ACH_SURVIVOR_100` | Bare Metal | 100 kills in one Survivor run | No |

Global “first in the world” achievements (`ACH_GLOBAL_*`) stay **post-1.0**.

#### Requirements


| ID       | Prio   | Requirement | Acceptance |
| -------- | ------ | ----------- | ---------- |
| `ACH-01` | should | Frozen `AchievementCatalog` with apiNames and conditions | No renames after lock |
| `ACH-02` | should | `AchievementManager` tracker → virtual `unlock` / `setStat` | Conditions fire in playtest; no SDK imports outside adapters |
| `ACH-03` | should | `LocalAchievementAdapter` always persists same apiNames | Survives reload offline / dev |
| `ACH-04` | should | `ItchAchievementAdapter` when itch host detected | Unlock forwards to Itch API |
| `ACH-05` | should | `PokiAchievementAdapter` when Poki embed detected | Unlock forwards to Poki SDK |
| `ACH-06` | defer  | `SteamAchievementAdapter` + Partner registration | Community tab + buffered `StoreStats` |
| `ACH-07` | should | Boot selects one platform adapter; Local always mirrors writes | Local-only when no SDK |
| `ACH-08` | defer  | Locked/unlocked icon pair (neon style) | Partner / platform asset check |
| `ACH-09` | defer  | EN + PT display strings | Locale switches description |


Open (achievements): final copy tone (`LORE-`) · exact thresholds · Boss General “complete” definition · final count 15–30 · cosmetic-only rewards · in-game toast for local unlocks on web.
