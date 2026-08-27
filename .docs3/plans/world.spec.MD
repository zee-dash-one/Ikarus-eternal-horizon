# Ikarus Eternal Horizon — World Presentation

tag_g_world tag_s_world_camera_rig tag_s_world_parallax
RESUME: Landscape letterbox, CameraManager follow box, free-cam unlock, three-layer parallax, playfield bounds + off-field despawn (`RUL-02`), DEV gizmos.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.17

**Related:** [`architecture.spec.MD`](./architecture.spec.MD) (`D40` Core/View) · [`scenes.spec.MD`](./scenes.spec.MD) (Run owns the rig) · [`drops.spec.MD`](./drops.spec.MD) (off-field recycle) · [`meteors.spec.MD`](./meteors.spec.MD) · [`builds.spec.MD`](./builds.spec.MD) (`BLD-05` gizmos)

Coverage: docs2 `B01`–`B04` · `RUL-02`. Feel reference: frozen `poc/` camera / parallax / limit-box — **not** a port map.

---

## Ownership

tag_g_world tag_s_world_camera_rig
RESUME: CameraManager owns follow-box sim state; View owns PerspectiveCamera + parallax meshes; bounds despawn is Core.

| Owns | Does **not** own |
| --- | --- |
| Playfield size / letterbox policy (`D44`) | Player motion (`PlayerManager`) |
| Follow / dead-zone / bounce / recenter **sim** | Combat HUD ([`hud.spec.MD`](./hud.spec.MD)) |
| Free Cam unlock + fly pose (`CAM-06`) | Virtual pad / ship motion (`PlayerManager`) |
| Despawn box tests (`RUL-02`) | Meteor spawn cadence ([`meteors.spec.MD`](./meteors.spec.MD)) |
| Parallax layer **data** (speeds, wrap) | Asset preload buckets (`SCENE-02`) |
| DEV gizmos toggle (`CAM-05`) | Production packaging (`BLD-05` compiles gizmos out) |

**Core vs View (`D40`):** follow-box math, recenter, despawn tests, and parallax **offsets** live in Core (plain numbers on `WorldSnapshot`). Free-cam **override pose** lives in View so it can tick on rAF while Core is paused (`CAM-06`). `PerspectiveCamera`, grid meshes, star points, and gizmo lines live in `render/`. `systems/camera-manager.ts` **must not** import `three` for follow-box math; the override is applied in `syncRender`.

---

## Aspect & letterbox (`CAM-01`, `D44`)

tag_g_world tag_s_world_letterbox
RESUME: Landscape 16:9 playfield with letterbox; docs2 portrait 540×960 retired; relative asset URLs.

| Rule | Detail |
| --- | --- |
| Playfield | **16:9 landscape** (`D44`). Default until `Q43` is flipped. |
| Letterbox | Never stretch. Pillarbox/letterbox bars on other window aspects. |
| Docs2 | Portrait `540×960` is **not** used in `poc3/`. |
| Paths | Game assets are **relative** URLs (Itch/Poki/Demo HTTPS-safe — `BLD-06`). |
| Numbers | CSS canvas size / safe margins live in `BALANCE.layout` only. |

Gameplay plane stays **X/Y** (Z visual) — [`planning.spec.MD`](./planning.spec.MD) game card.

---

## Perspective camera (`CAM-02`)

tag_g_world tag_s_world_camera_rig
RESUME: Tilted perspective rig — ship top, right side, and rear thrusters readable.

| Rule | Detail |
| --- | --- |
| Kind | `THREE.PerspectiveCamera` in View; rotation order `YXZ` |
| Framing | Default pose always shows **top face · right side · rear thrusters** |
| Config | FOV / near / far / position / rotation via `BALANCE.camera` — `applyConfig` from snapshot, not hardcoded in render |
| Debug | IJKL/UO **without** Free Cam on = DEV-only leftover; stripped in PROD (`BLD-05`). Product fly is **`CAM-06`**. |

---

## Follow / limit box (`CAM-03`)

tag_g_world tag_s_world_follow_box
RESUME: Dead-zone follow box with bounce on edge and auto-recenter when still.

| Rule | Detail |
| --- | --- |
| Dead zone | Ship moves inside `halfX`/`halfZ` without moving the camera |
| Edge | Crossing the box eases the camera with **bounce** (settle time in `BALANCE`) |
| Recenter | After still + delay, force toward a single Recenter Point; per-axis; **interrupted by input** |
| Sim | Follow-box state is Core; View copies camera world position from snapshot |
| Pause | Follow math does not advance while Core ticks are gated (`D21`) |
| Free Cam | When `CAM-06` is **on**, this box is **ignored** — camera pose is unlocked (see below) |

---

## Free Cam (`CAM-06`)

tag_g_world tag_s_world_free_cam tag_s_world_camera_rig
RESUME: Graphics toggle unlocks the follow box — free fly in live Run and while Pause freezes the world.

**Product option** (ships in all builds). Not the DEV IJKL leftover (`BLD-05`). Default **off**.

| Rule | Detail |
| --- | --- |
| Toggle | Pause → **Graphics** → **Free Cam** ([`scenes.spec.MD`](./scenes.spec.MD) `SCENE-05`). Session flag on Run; turning it off/on does not require a scene remount |
| On | Follow box, bounce, and recenter are **disabled**. View owns an override pose and **does not** copy follow position from the snapshot |
| Off | Override dropped; camera **eases back** onto the follow-box pose (`BALANCE.camera.freeCam.rejoinMs`). No teleport |
| Live Run | World sim keeps ticking. Ship still reads the virtual pad (`WASD` / stick). Camera fly is a **parallel** path — does **not** steal pad tokens (`D27`) |
| Pause | Core world ticks stay gated (`D21`). **Free-cam pose still updates on rAF** so the player can inspect a frozen field. Overlay may stay; fly keys are not consumed by Pause chrome |
| Fly | Physical **I**/**J**/**K**/**L** (strafe/forward) · **U**/**O** (up/down) — same as frozen `poc/` debug rig. Outside the virtual pad. Speed in `BALANCE.camera.freeCam` |
| Gamepad / Touch | Not required v1 (`Q48`) |
| Parallax | Still driven by camera Δ — free fly slides layers |
| Despawn | `RUL-02` stays playfield/ship-relative — **not** the camera frustum |
| HUD | Floating bars still project from the **player craft**, not the free camera |
| Persist | Run session only (`Q49`) — next run starts **off** |

**Why View-owned:** Pause stops Core `updateSim`. A Core-only camera would freeze with the world. The override lives in View (`render/` / `CameraManager.syncRender`) so fly works while sim time is frozen.

---

## Parallax (`CAM-04`)

tag_g_world tag_s_world_parallax
RESUME: Three layers, distinct speeds, camera-delta driven; numbers in BALANCE only.

| Rule | Detail |
| --- | --- |
| Count | **Three** layers (structural lock) |
| Drive | Camera **Δ between frames** shifts stars opposite ∝ `parallaxGain`; layers do **not** read Full Sheet |
| Speeds | Three rates must read at a glance; exact gains in `BALANCE.parallax.layers[]` |
| Wrap | Own flight along visual depth with wrap (`zNearWrap` / `zFar`) |
| Run | Parallax is mounted with the player craft as soon as Run exists (Theme 2 / 4b — [`scenes.spec.MD`](./scenes.spec.MD) `SCENE-05`) |

---

## Playfield bounds & despawn (`RUL-02`)

tag_g_world tag_s_world_playfield_bounds tag_g_drops tag_s_drops_fragment_pool
RESUME: One despawn box — shots, meteors, drops, enemies recycle off-field; nothing accumulates off-screen.

| Rule | Detail |
| --- | --- |
| Box | `BALANCE.world.despawn` — axis-aligned X/Y (gameplay plane) plus a Z visual slack |
| Recycle | Entity outside the box → owning `*Manager` **releases to pool** (never `dispose` GPU from Core) |
| Who | `ShotManager` · `MeteorManager` · `DropManager` · `EnemyManager` (and bombs when they exist) |
| Player | Player craft is **clamped** to the playfield; it does **not** despawn |
| Drops | Off-field fragment → pool (`RES-03` adjacency — [`drops.spec.MD`](./drops.spec.MD)) |
| Zero alloc | Despawn path allocates nothing on the hot tick |

This ID is the design home that `drops.spec.MD` already cites. Theme 5/6/7 tests must import this contract, not invent a second box.

---

## DEV gizmos (`CAM-05`)

tag_g_world tag_s_world_gizmos
RESUME: World axes, playfield grid, camera axes — toggleable; compiled out of production.

| Rule | Detail |
| --- | --- |
| Contents | World axes · playfield grid · camera axes with labels |
| Toggle | Debugger / Pause Dev tab; default **off** |
| PROD | Absent (`BLD-05`) — no leftover scene-graph objects when toggled off in DEV |

---

## `CameraManager` contract (sketch)

```
updateSim(tick)      // follow box, recenter — **skipped** while freeCam
setFreeCam(on)       // Graphics toggle; session flag
isFreeCam()          // readonly
syncRender(alpha)    // View: follow pose **or** free-cam override (ticks on rAF even if Core paused)
setGizmosVisible(on) // DEV; no-op in PROD
dispose()            // View graph only; does not dispose shared AssetManager cache
```

Run scene constructs one `CameraManager` + `ParallaxField` (View) for the lifetime of Run.

---

## Requirements (`CAM-` · `RUL-02`)

| ID | Prio | Theme | Requirement | Acceptance |
| --- | --- | --- | --- | --- |
| `CAM-01` | must | 2 | Landscape 16:9 playfield + letterbox; relative asset paths (`D44`) | Window resize never stretches; docs2 portrait size unused |
| `CAM-02` | must | 2 | Perspective rig readable top / side / thrusters | Default pose shows all three; config from `BALANCE.camera` |
| `CAM-03` | must | 2 | Follow box: dead-zone, bounce, recenter | Ship inside box does not move camera; edge eases; still recenters; input interrupts |
| `CAM-04` | must | 2 | Three parallax layers, distinct speeds | Camera motion slides backgrounds at 3 readable rates |
| `CAM-05` | should | 2 | DEV gizmos toggle | Off leaves no objects; PROD build has no gizmos |
| `CAM-06` | must | 2 | Free Cam option unlocks the rig in Run **and** Pause | On: follow box ignored; fly works while paused and while live; Off: eases back to follow pose; pad still flies the ship |
| `RUL-02` | must | 2 | Playfield bounds + off-area despawn | Long fire / meteor / drop session does not grow off-screen population |

---

## BALANCE keys (feel stubs — Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `layout.aspect` | `16/9` until `Q43` |
| `layout.letterboxColor` | Bar fill |
| `camera.fov` / `near` / `far` / `position` / `rotation` | Default readable pose |
| `followBox.halfX` / `halfZ` | Dead zone |
| `followBox.bounceMs` / `recenter.*` | Edge settle + auto-center |
| `parallax.layers[]` | Per-layer `gain` · `speed` · wrap |
| `camera.freeCam.moveSpeed` / `riseSpeed` | Fly while option on |
| `camera.freeCam.rejoinMs` | Ease back onto follow box when option off |
| `world.despawn` | Off-field recycle box |
| `world.playfield` | Safe margins (HUD + spawns) |

---

## Open questions

| # | Question | Default until tuned |
| --- | --- | --- |
| Q43 | Playfield 16:9 vs 9:16 (Theme 2 todo said “Landscape 9:16”) | **16:9 landscape** (`D44`) |
| Q48 | Gamepad / Touch mappings for Free Cam fly | **Keyboard IJKL/UO only** v1 |
| Q49 | Persist Free Cam across runs | **Off** each new Run |
