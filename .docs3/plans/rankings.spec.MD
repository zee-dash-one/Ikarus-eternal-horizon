# Ikarus Eternal Horizon — Rankings — Leaderboards

tag_g_rankings tag_s_rankings_submit_pipeline tag_s_rankings_local_adapter
RESUME: Eight UTC boards (Normal/Survivor × W/M/Y/E); Local bests always; one upload adapter per boot.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

Satellite: [`../../.docs2/plans-later/ranking-plan.spec.MD`](../../.docs2/plans-later/ranking-plan.spec.MD)

---

## Publish adapters (`RNK-01`, `D30`)

tag_g_rankings tag_s_rankings_submit_pipeline tag_s_rankings_local_adapter
RESUME: End-of-run score submission — stable board IDs, Local bests always, one platform upload adapter per boot.

Run/Result systems call **only** `RankingManager` — never Steamworks, Poki SDK, or Itch APIs directly.

#### Board matrix (locked)

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
| `buildVersion` | Patch filter |
| `mode` | `normal` \| `survivor` |
| `endedAt` | UTC timestamp for period bucket |

Submit only when `score > 0` and run is **valid** (legitimate end — player **DEAD** in Normal/Survivor; no partial continue).

#### Publish adapters

| Adapter | Host / build | Role |
| --- | --- | --- |
| **`LocalRankingAdapter`** | **Always** | Client-side bests per mode × period in UTC; survives reload |
| **`ItchRankingAdapter`** | itch.io | Upload to Itch leaderboard API when host detected |
| **`PokiRankingAdapter`** | Poki embed | Poki SDK score upload |
| **`SteamRankingAdapter`** | Steam PC | `FindOrCreateLeaderboard` · `UploadLeaderboardScore` (**KeepBest**) |

Boot: detect platform → attach **one** upload adapter (or Local-only). **Local always mirrors** the best score write. Offline: queue upload; flush on reconnect.

#### Stable board API names (immutable after release)

| Mode | Weekly | Monthly | Annual | Eternal |
| --- | --- | --- | --- | --- |
| Normal | `LB_ARCADE_WEEKLY` | `LB_ARCADE_MONTHLY` | `LB_ARCADE_ANNUAL` | `LB_ARCADE_ETERNAL` |
| Survivor | `LB_SURVIVOR_WEEKLY` | `LB_SURVIVOR_MONTHLY` | `LB_SURVIVOR_ANNUAL` | `LB_SURVIVOR_ETERNAL` |

Same IDs in Local storage keys and platform Partner registration.

#### `RankingManager` contract (sketch)

```
submitRun(payload)           // end of valid run
getLocalBest(mode, period)
getBoardView(mode, period)   // local rows; platform views when adapter live
flushUploadQueue()
setPublishAdapter(local | itch | poki | steam)
dispose()
```

#### Rankings scene (`SCENE-04` partial)

Canvas UI (`D23`): **Normal | Survivor** tabs → **Weekly | Monthly | Annual | Eternal**. Shows local bests first; Steam Global/Friends/Around when adapter active. Period rollover → brief reset notice. Top ranks may grant **cosmetic** title/badge only — no combat power (`RNK-09`).


## Requirements & Survivor (`RNK-`)

**Design detail:** publish adapters section above · decision `D30`

tag_g_rankings tag_s_rankings_board_matrix tag_s_rankings_survivor_mode
RESUME: Eight UTC leaderboards (Normal/Survivor × W/M/Y/E), Local persistence, platform upload adapters, Rankings canvas scene.

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
| Difficulty | Same kill curve and milestones as Normal |
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


| ID       | Prio   | Requirement | Acceptance |
| -------- | ------ | ----------- | ---------- |
| `RNK-01` | should | Local bests — Normal Eternal minimum (`LocalRankingAdapter`) | Survives reload |
| `RNK-02` | should | UTC window calc W/M/Y on client | Weekly board resets on Monday UTC |
| `RNK-03` | defer  | Survivor mode playable per table above | Zero loadout, laser only, one-shot |
| `RNK-04` | should | Rankings canvas UI: 2 modes × 4 periods | Tabs show separated local bests |
| `RNK-05` | must   | Modes never mix on a board | Survivor score never listed under Normal |
| `RNK-06` | defer  | `SteamRankingAdapter` — 8 boards, KeepBest | Score on correct `LB_*` board |
| `RNK-07` | defer  | Offline upload queue + sync | Queued score uploads on reconnect |
| `RNK-08` | defer  | Steam views Global / Friends / Around user | Toggle in Rankings UI |
| `RNK-09` | defer  | Cosmetic rank title/badge | No combat stat grants |
| `RNK-10` | should | `ItchRankingAdapter` when itch host | Upload uses same `LB_*` mapping |
| `RNK-11` | should | `PokiRankingAdapter` when Poki embed | Upload uses same `LB_*` mapping |
