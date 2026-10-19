# Ikarus Eternal Horizon — Run Preparation & Sprints

tag_g_scene_flow tag_g_engine tag_g_enemy tag_g_environment
RESUME: Authoritative POC3 preparation sequence, 50-wave combat sprints, independent enemy/asteroid schedules, and bounded look-ahead.

**Revision:** 2026-10-02 · **Status:** approved direction; implementation pending.
**Hub:** [planning.spec.MD](./planning.spec.MD) · **Execution:** [todo-codex.md](../todo-codex.md).

This revision supersedes kill-count-triggered wave/boss progression in the GDD and earlier docs3 plans. Kills remain score inputs. POC3 is the product codebase; POC2 is a study reference only for enemy movement and group logic. Do not import its architecture, rendering, persistence, or other gameplay systems.

## Vocabulary and defaults

- **Run:** one attempt from preparation through player DEAD, result, and score submission.
- **Sprint:** an in-game combat cycle, numbered from **1**; not a development iteration.
- **Wave:** an enemy encounter within a sprint. User-confirmed: **50 waves, indexed 0–49**. Wave **49** contains the miniboss.
- **Sector:** data describing eligible factions, enemy archetypes, formations, asteroid mix, and presentation. Faction is distinct from combat class (Tanker/Warrior/Rogue/Special).
- **Proposed tuning default:** one sector per sprint; sector progression comes from an explicit `BALANCE` table and may repeat sectors. Exact sector order, rosters, counts and cooldown values await playtesting; do not claim them as user-approved values.
- **Proposed pacing default:** no overlap between enemy waves. Advance after all scheduled members are emitted and all wave members are destroyed or retired, then wait the planned cooldown. Retreat/despawn grants no kill reward. A miniboss must be defeated to complete wave 49; retreat must requeue the same encounter, never count as victory.

## Ordered preparation (`FLOW-01`–`FLOW-07`)

Preparation starts on Title → Play. Keep a responsive preparation overlay on the hub until Run is ready. A partially initialized world must never receive combat ticks.

| Step | Owner / output | Ready condition |
| --- | --- | --- |
| 1. Create enemy spawn points | `SpawnPointManager`: stable IDs, position, direction, lane/volume and capacity | Points validated against playfield and safe player entry area |
| 2. Create asteroid spawn points | Separate asteroid registry in `SpawnPointManager` | Independent IDs/configuration; no Enemy/Squad state machine |
| 3. Instantiate three parallax levels | Preparation asks View to allocate **far / middle / near** layers | Three layers ready; speed/depth/palette from `BALANCE`; no collision entities |
| 4. Resolve sector enemy types | `SectorManager`: faction → eligible archetypes + squad recipes + miniboss | Every referenced ID exists; sector has a legal miniboss |
| 5. Prepare Sprint 1 | `SprintPlanManager`: immutable `SprintPlan`, seeded and versioned | Exactly 50 `WavePlan` entries (0–49) plus asteroid schedule |
| 5.1. Compute enemy cooldowns | Per-wave intervals from sprint difficulty profile | Finite values, bounded minimum/maximum; stored in plan |
| 5.2. Compute asteroid cooldowns | Independent asteroid intervals from same difficulty profile | Separate timer; enemy clearance does not reset asteroid cadence |
| 5.3. Define every enemy wave | Archetype, faction, count, squad/formation, spawn point and offsets | Sector whitelist and active-entity budgets respected |
| 5.4. Define asteroid sequence | Size, spawn point, drift and sprint-time offset for each event | Ordered, deterministic, finite plan segment |
| 5.5. Define final miniboss wave | Wave 49 marked `miniboss`; explicit completion rule | Exactly one final miniboss encounter; no duplicate kill milestone trigger |
| 6. Stage first encounter in memory | Reserve inactive pool entries for wave 0 and the first asteroid batch; warm required View assets | Allocation complete but collisions, AI and timers still inactive |
| 7. Load game screen | `SceneManager` mounts ready `RunScene` with prepared context | World, HUD, parallax and staged entities are ready |
| 7.1. Ikarus enters | `RunFlowManager`: `ENTERING`; configurable entry animation | Combat controls, hostile damage, score clock and spawn timers gated until `PlayerEntryCompleted` |
| 7.2. Start first sprint | Enter `ACTIVE`, activate wave 0 and start independent asteroid schedule | `SprintStarted` and `WaveStarted` emitted once |
| 7.3. Prepare next sprint | Build Sprint 2 plan incrementally while Sprint 1 runs | Prepared plan cannot spawn or change current sprint state |

No network, SQLite access, asset decoding or full-sprint allocation inside the simulation tick. Async preparation returns a result that is adopted only at a tick boundary; cancellation uses a run generation/token so stale completions cannot mount a cancelled Run.

## Lifecycle and handoff (`FLOW-08`)

```text
Title → PREPARING → READY → ENTERING → ACTIVE
                                      │        │
                                      │        ├─ prepare sprint N+1 (inactive)
                                      │        ├─ waves 0 … 48 → wave 49 miniboss
                                      │        └─ miniboss defeated + remaining wave members retired
                                      │                       ↓
                                      │                    TRANSITION
                                      │                       ↓
                                      └────────────── ACTIVE sprint N+1

ACTIVE / ENTERING → player DEAD → FINISHED → Result → Rankings / Title
PREPARING / READY / ENTERING / ACTIVE / TRANSITION → quit/logout → CANCELLED
```

- Pause freezes entry, simulation, enemy cooldown, asteroid cooldown and transition clocks; UI and rendering stay responsive. Resume has no elapsed-time catch-up.
- Player integrity 0 still means `DRIFTING`; only `DEAD` finalizes the run (`CHAR-04`).
- Next-sprint planning is bounded by work units per frame; a worker is optional only if profiling warrants it. Keep **current + next** plan, capped entity/View pools and staged wave 0 only; never instantiate 50 live waves.
- Each asteroid schedule is a finite look-ahead segment. If enemies take longer, append deterministic bounded segments for the current sprint. Never release all overdue events in one tick.
- On miniboss completion, stop old-sprint emissions, retire leftover old-sprint asteroids without rewards during the transition, then atomically swap plans and reset sprint clocks. Discard unused old events.
- If the next plan is late, remain in a safe `TRANSITION` with a preparation indicator. Do not start half a sprint, skip encounters or block the UI thread.
- Preparation errors keep the user on the hub with retry/back. Retry releases partial reservations. Quit, death and logout cancel look-ahead and release owned resources/listeners.
- If a mandatory enemy pool allocation fails, defer that spawn; the wave remains incomplete. Miniboss is never skipped. Optional asteroid/VFX events may be dropped with a diagnostic counter.

## Data contracts and responsibilities (`FLOW-09`)

Proposed interfaces belong in `poc3/src/core/`; proposed owners in `poc3/src/systems/`. These names describe work to implement, not existing classes.

| Contract / owner | Responsibility |
| --- | --- |
| `RunConfig` | runId, runSeed, mode, balance/content version and sector progression |
| `SprintPlan` | sprintIndex, sectorId, derived seed, difficulty profile, waves[50], bounded asteroid sequence |
| `WavePlan` | waveIndex, kind, enemy/squad descriptors, cooldown, planned spawn offsets, completion policy |
| `AsteroidSpawnEvent` | stable event ID, scheduled sprint tick, size/archetype, spawnPointId and velocity |
| `RunPreparationManager` | Execute preparation steps; progress, cancellation, retry and handoff |
| `SpawnPointManager` / `SectorManager` | Validate registries and resolve sector content |
| `SprintPlanManager` | Pure deterministic planning from config, seed and `BALANCE`; no DOM/Three.js/storage |
| `RunFlowManager` | Lifecycle, entry gate, sprint handoff and generation tokens |
| `WaveManager` | Enemy wave clock, wave membership and exactly-once activation/completion |
| `EnemyManager` / `SquadManager` | Entity pools, movement, AI and group state; consume planned spawns |
| `MeteorManager` | Own asteroid entities; consume planned asteroid events; no independent random spawn timer |
| `RunSimulation` | Explicit sim ordering and snapshot/event publication |
| `RunScene` | Mount/dispose View and apply snapshots; no authority over combat or score |
| `GameLoop` | Fixed-step scheduler, pause and bounded catch-up; no content preparation |

Difficulty is computed from sprintIndex and waveIndex using authored tables/curves with caps. Use independent derived RNG streams for enemies, asteroids and cosmetics, so changing parallax does not alter combat plans. Kills do not unlock another boss in parallel.

Simulation order: consume input/commands → flow/entry gate → wave and asteroid scheduling → movement/AI → firing/projectiles → collision/damage → deaths/drops/score → wave completion → publish immutable snapshot/events. Render reads the snapshot on rAF; persistence consumes result events asynchronously. Poll pause/resume input even when no simulation step runs.

The existing runtime uses `x/z` for movement while earlier specs say `X/Y`. Standardize the logical two-axis contract and document the world/view conversion before implementing spawn coordinates; preserve current POC3 controls and do not silently swap axes.

## Acceptance matrix

| ID | Must verify |
| --- | --- |
| `FLOW-01` | Independent validated enemy and asteroid points; no spawn in entry safe area |
| `FLOW-02` | Exactly three View layers; no preparation allocations inside combat tick |
| `FLOW-03` | Every enemy and miniboss belongs to the selected sector catalog |
| `FLOW-04` | Same seed/config/version yields identical 50-wave plan; wave 49 is miniboss |
| `FLOW-05` | Enemy and asteroid schedules are independent, capped and pause-safe |
| `FLOW-06` | First encounter is staged inactive before Run mounts; entry completes before attacks |
| `FLOW-07` | Sprint N+1 planning does not mutate N; only bounded look-ahead retained |
| `FLOW-08` | Atomic handoff, cancellation, late plan, retry and pool exhaustion handled without duplicate waves |
| `FLOW-09` | Fixed sim and snapshot rendering separated; bounded catch-up; score from gameplay events |

Open tuning: exact cooldown curves, enemy counts/rosters, asteroid mix, entry duration and sector order. The structural sequence and **50 waves (0–49)** are settled.
