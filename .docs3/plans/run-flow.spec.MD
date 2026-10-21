# Ikarus Eternal Horizon — Run Preparation & Sprints

tag_g_scene_flow tag_g_engine tag_g_enemy tag_g_environment
RESUME: Authoritative POC3 preparation sequence, 50-wave combat sprints, independent enemy/asteroid schedules, and bounded look-ahead.

**Revision:** 2026-10-21 · **Status:** C/D/E implemented: preparation, protected entry, combat and bounded sprint look-ahead.
**Hub:** [planning.spec.MD](./planning.spec.MD) · **Execution:** [todo-codex.md](../todo-codex.md).

This revision supersedes kill-count-triggered wave/boss progression in the GDD and earlier docs3 plans. Kills remain score inputs. POC3 is the product codebase; POC2 is a study reference only for enemy movement and group logic. Do not import its architecture, rendering, persistence, or other gameplay systems.

F01–F04 integration is implemented; [consolidation](./consolidation.spec.MD) records economy, modes, recovery and validation. Real-provider activation/release gates remain pending.

## Vocabulary and defaults

### Implemented runtime foundation (part C)

- `RunSimulation` owns the fixed gameplay order and immutable snapshots (player, stats, projectiles, active weapon, score/time). It receives a DOM-free virtual input frame. `RunScene` only mounts/disposes View and draws those snapshots; camera and parallax are presentation state and do not affect combat. DEAD freezes sim; the next UI frame freezes the timestamped result and starts submission outside the tick.
- `GameLoop.beforeFrame` polls input/pause before the simulation gate, even on paused or zero-tick frames. The input buffer retains press edges until the next tick and consumes each once across catch-up ticks. Sim always uses `1/60` seconds; UI/render uses a separate bounded frame delta.
- Scheduler policy: clamp frame delta to 250 ms, execute at most 5 sim ticks per frame, drop overdue whole ticks and retain only a sub-tick fraction. Start/stop/resume/new run reset accumulated debt. Visibility changes reset the clock; hiding a live run opens Pause and requires explicit resume.
- `RunFlowManager` enforces PREPARING → READY → ENTERING → ACTIVE, ACTIVE ↔ TRANSITION and FINISHED/CANCELLED. Preparation is promise-based with AbortSignal + generation guards; late contexts are disposed. Only the next frame boundary adopts READY, once. D adds registries, catalog, Sprint 1 planning, detached View allocation and inactive encounter reservations. E keeps ENTERING until logical `PlayerEntryCompleted`; lifecycle mirrors the simulation phase at the next frame boundary.
- `RunContext` owns sheet, energy/player/firing managers, projectile pool, events, result metadata/seed and registered cleanup callbacks. Cancel/quit/logout/restart disposes it; no prior attempt's managers remain on GameApp. Session/input bindings/assets remain shared. Cancel is available during preparation; duplicate Play is ignored.
- Start remains a gesture/audio gate before Title. Title offers Play and Rankings without automatic combat navigation.

### Implemented world preparation (part D)

`RunPreparationManager` captures an immutable BALANCE snapshot and follows six yielding stages: enemy points → asteroid points → three parallax layers → sector/catalog → deterministic Sprint 1 plan → inactive wave 0 / first asteroid batch + asset warmup. Progress/Cancel stay on Title. Validation/warmup errors release partial reservations and View resources; abort also releases resources while a warmup promise is pending. GameApp refuses to mount Run without prepared, warmed View resources and adopts the same graph; it never builds a second parallax field on mount.

- `SpawnPointManager` has separate immutable registries with stable IDs, volumes, inward unit directions and capacities. All volumes must fit the world plus spawn margin and remain outside the safe entry rectangle containing the player origin. X/Z is canonical. Overlapping enemy/asteroid channels are independent; each registry has its own capacity checks.
- `SectorManager` validates archetype/faction/sector references, unique IDs, formations, miniboss ownership and positive finite asteroid weights. The minimal catalog contains two prototype patrol factions/sectors (Maldroids / Hollows), each with Tanker/Warrior/Rogue drones and a Special miniboss. Faction and class remain separate fields. The playable catalog uses same-class V / Circle (4–8) / LineDivers; expanding content with mixed recipes remains product consolidation work.
- `SprintPlanManager` returns frozen 50-wave plans (0–49). Each descriptor includes archetype, faction, squad/formation, slot, spawn point, concrete position/direction and entry offset. Only wave 49 is miniboss. `WaveManager` requires all emissions and clearance before cooldown; final clearance additionally requires the miniboss destruction event. No kill-count boss trigger exists.
- Seeds derive from run seed, content/balance versions, sprint and sector. Enemy planning, asteroid segments, wave AI and cosmetics use independent streams. `RUN_CONTENT_VERSION=poc3-4` is sent when acquiring tickets; older results remain intact. Planning version is `BALANCE.preparation.version=sprint-2`.
- Asteroids have an independent cooldown and bounded absolute sprint-tick segments. `asteroidSegment(seed, sprintIndex, sector, index)` deterministically extends the sequence without mutating older data, duplicating IDs or resetting cadence at segment boundaries. E consumes/extends these segments; D does not run an emitter.
- `EnemyManager` reserves pooled crafts with full CHAR sheets; `MeteorManager` reserves pooled asteroid state. Only wave 0 and the first batch are reserved. Active/collidable remain false before entry. Failed reservations roll back the whole initial batch. All pool objects are preallocated before combat; E activates descriptors at their offsets, then recycles them.
- `RunViewResources` allocates three configured parallax levels at step 3, then player/HUD/projectile assets and primitive hidden meshes for reserved entities at step 6. Renderer compiles a detached scene, without drawing combat or advancing clocks. Scene/context disposal is idempotent. Pause → Dev → Ship → Live shows plan/reservation counts for QA.

Current tuning (adjustable in `BALANCE.preparation`, not new fixed design requirements):

| Setting | Initial value |
| --- | --- |
| Safe entry / spawn envelope | x −12…12, z −20…30 / margin 32 |
| Enemy / asteroid points | 3 each; point capacity 8 / 4 |
| Sector order | maldroid-frontier, hollow-belt; Sprint 1 uses first |
| Enemy budget / prewarm | 24 objects preallocated; minimum preparation setting 8; wave 0 reserves 3 |
| Regular wave population | 3 + floor(wave/10) + capped sprint growth, at most 8 |
| Enemy entry spacing | 12 ticks between members |
| Enemy cooldown | 2.5 s − 0.1 per later sprint − 0.02 per wave, clamped 0.75–3 s |
| Asteroid budget / first batch | 16 / 3 |
| Asteroid cooldown | 1.8 s − 0.05 per later sprint, clamped 0.45–2.5 s; independent of waves |
| Asteroid segment / maximum descriptors | 1800 ticks (30 s) / 128 |
| First asteroid / drift speed | tick 60 / 6–12 units/s, lateral variation up to 2 |

Cooldowns round up to whole 60 Hz ticks. These plans and reservations do not activate enemies, asteroids or sprint clocks. The existing player-only flight remains until E wires entry, scheduling and combat.

### Coordinate contract (C06)

Canonical logical coordinates are **X/Z**, matching current POC3 controls and BALANCE bounds. Right = +X, left = -X, up/forward = -Z, down = +Z. Older gameplay references to “X/Y” mean the two-axis plane and do not introduce a second coordinate system: their vertical gameplay axis corresponds to Z with the existing signs. New spawn/plan contracts must use x/z.

The View boundary uses `playfieldToWorld({ x, z }, height)` → `{ x, y: height, z }`; visual Y defaults to 0. `worldToPlayfield` discards visual height. Player/projectiles use this conversion without an axis swap or sign change. Camera height, mesh banking and cosmetic parallax depth are View-only.

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

## Implemented execution (part E)

- Entry lasts `BALANCE.combat.entryTicks` (90 fixed ticks): Ikarus follows a cubic approach from z=24 to the origin. Player input, firing, collisions, energy/score elapsed time and both spawn clocks remain gated. Pause stops entry ticks. `PlayerEntryCompleted`, `SprintStarted` and `WaveStarted` are emitted once; the first enemy activates on the next combat tick.
- `WaveManager` owns emission → clearance → authored cooldown → next wave. Enemy pool failure keeps the descriptor pending; a successful delayed spawn schedules the next relative spacing from that tick. At most one enemy and one optional asteroid are emitted per tick. Miniboss cannot flee/despawn and does not resolve merely by surviving a timeout.
- `SquadManager` owns stable slots, deterministic leader election (highest Summary LVL, then ID), grouping/patrol/loop/approach/break state. `EnemyManager` owns separate EnterGate/FindGroup/LoopBack/Flee/Fury state, smooth heading, separation, locked dive velocity, pooled hostile bolts and class CHAR. Gate targets and patrol slots follow the player within the configured standoff. Casualties can break a squad; a Flee craft can regroup while still on-field. Off-field retreat gives no reward.
- `CombatManager` resolves relative swept-circle hits against moving bodies, consuming each player bolt at its nearest enemy/meteor impact. `DamageManager` applies enemy/player CHAR damage and meteor HP damage. Contacts have a configurable player grace interval. Player dash prevents contact damage. Meteors have no CHAR, drift at planned velocity, and retire without score/drop on contact, off-field exit or sprint transition. Destruction emits score plus `drop_requested`; F now consumes drops into its bounded run economy. Optional split/VFX remain later work.
- `SprintPlanManager.prepare` yields one wave per work unit. `GameApp` calls look-ahead once per unpaused frame, at most `planningWavesPerFrame=5` units. Keep one current plan and one next plan/partial generator. Asteroids keep bounded current/next deterministic segments. No planning, catalog resolution, mesh creation, asset loading or I/O runs in `RunSimulation.step`.
- Final miniboss defeat plus wave clearance enters safe TRANSITION. Old asteroids and bolts are retired without rewards, player bolts cleared, the old agenda stopped. A ready next plan/sector swaps atomically on a tick boundary; a late plan keeps controls/damage/score clocks gated while UI and bounded planning remain responsive. Sector order repeats cyclically from `BALANCE.preparation.sectorOrder`.
- Pools and View caches have fixed caps. Prepared gameplay uses a bounded score authorization set for emitted entity IDs; destruction consumes authorization and despawn prunes it. Replayed retired IDs cannot score. DEV shows phase/sprint/wave/sector, current/next plan count, active entities, optional omissions and mandatory pool waits. Existing result-changing DEV commands mark the attempt ineligible.

Validation: `wave-manager.test.ts` executes two full sprints, verifies all 100 ordered wave starts and both minibosses, frame-only planning, pause/cancel, late handoff, pool pressure, replay rejection and bounded pools/score credits. `squad-manager.test.ts` verifies stable slots, independent strategy, leader election and break after losses. Browser QA covers protected entry, wave 0, keyboard firing, enemy kills/score, incoming shield damage, pause and DEV counters.

POC2 study: [poc2-enemy-study.MD](./poc2-enemy-study.spec.MD).

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

Content interfaces belong in `poc3/src/core/`; domain owners in `poc3/src/systems/`. C/D/E implement the contracts below. F adds the run economy, equipment/crafting/drops, arsenal and presentation. Additional GDD content and live production gates remain explicit future work; see consolidation.spec.MD.

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

Use the X/Z coordinate contract above for new spawn coordinates; preserve current POC3 controls.

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
