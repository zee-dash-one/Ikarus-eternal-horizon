# Ikarus Eternal Horizon — Scenes & Boot Flow

> **Part B implementation (2026-10-19):** TitleScene retains the shared canvas background; an accessible React menu overlay offers Play / Rankings. Result and Rankings are conditional React DOM panels under #run-meta-root (active IDs #result-root / #rankings-root). DEAD disposes Run before Result; DRIFTING keeps the attempt alive. New attempts reset simulation managers. Quit returns to Title without a score submission. World/sprint preparation remains FLOW/D/E work; the current start gate obtains the run ticket.


> **Current flow (D47–D50):** DEV email-only Login → Start/audio unlock → Title (Play / Rankings) → preparation → Run entry → sprint combat → Result. Rankings opens from Title or Result. No automatic Title → Run. [Run preparation spec](./run-flow.spec.MD) owns FLOW-01–09; older Google/password acceptance below applies only after revised production auth lands.

## Run gate revision

**D implemented (2026-10-19):** Title shows progress/Cancel across six preparation stages. The run ticket uses content version poc3-2; the manager snapshots BALANCE, validates registries/catalog/plans, reserves only the initial encounter, and warms the detached View. GameApp mounts the same graph only after READY; errors/cancel release it. The entry animation and actual Sprint/Wave activation described next remain E work.

Title remains visible and responsive while `RunPreparationManager` creates enemy points, asteroid points, three parallax levels, sector content, all 50 wave plans and the first inactive encounter. Only after READY does `SceneManager` mount Run. Ikarus enters before Sprint 1 starts; wave 0 and asteroid timers activate on `PlayerEntryCompleted`. Next-sprint preparation runs with bounded work during the current sprint. Error allows retry/back; cancellation prevents late scene mounts. RunScene presents snapshots; it does not own combat clocks or score.


tag_g_scene_flow tag_s_scene_canvas_render tag_g_assets tag_g_audio tag_g_run_meta
RESUME: HTML Login → canvas Start/Title/Run; HTML Result/Rankings; Pause overlay on Run; SCENE-01/02/03/04/05 detail.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.14

---

## Requirements (`SCENE-`)



| ID         | Prio   | Requirement                                                                                           | Acceptance                                                         |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `SCENE-01` | must   | Login scene; skip when `AuthSession` exists; DEV email mock via SQLite session; production Google/email deferred            | Auth → **Start**; skip path boots straight to Start                |
| `SCENE-02` | must   | Start: cockpit art + centered Start; preload; on critical ready fire `welcome_screen_ready` (mock OK) | Cue fires once at ready; Start unlocks audio if needed; then Title |
| `SCENE-03` | should | Title scene (main menu)                                                                               | Canvas hub — entered from Start; Store tab is DOM (`D34`)                          |
| `SCENE-04` | should | **Title → Run** (canvas) · **Result → Rankings** (DOM)                                                  | Run on canvas · Result/Rankings HTML/CSS + JS Bridge — [`rankings.spec.MD`](./rankings.spec.MD) (`RNK-04`) |
| `SCENE-05` | must   | Pause overlay: freeze time; run panel + Controls / Audio / Graphics / Dev tabs                        | Opens once Run shows player ship + parallax; sim frozen while open |


## Login gate (`SCENE-01`)

tag_s_scene_login_auth tag_s_scene_login_ui
RESUME: Auth gate before canvas Start — HTML/CSS shell + JS Bridge; detail in [`login.spec.MD`](./login.spec.MD).

**Kind:** **DOM shell panel** (`D41`) — same HTML/CSS + JS Bridge stack as the Store tab (`D34`). **Not** a canvas scene.

#### Boot

- If a valid `AuthSession` exists → **hide** `#login-root`; `SceneManager` mounts **Start** (`D19`).
- Otherwise `#login-root` is the first user-facing chrome (canvas hidden or idle backdrop).

#### Flow (summary)

| Step | Behaviour |
| --- | --- |
| Probe | `AuthManager.probeSession()` on boot |
| Skip | Session ok → Start directly (Login flash ≤1 frame) |
| Show | No session → `#login-root` visible |
| Sign in | DEV email mock (production: Google or real email) → **Start** on success |

Full UI controls, adapter matrix, bridge contract, and `AUTH-*` requirements: [`login.spec.MD`](./login.spec.MD).

#### Acceptance

- Cold boot with session → Start (Login never flashes, or flashes ≤1 frame).
- Cold boot without session → Login DOM; DEV email Sign in → Start.
- DEV hides Google and rejects Google routes; future production OAuth keeps Login until the session probe succeeds.

## Start scene (`SCENE-02`)

tag_g_scene_flow tag_g_assets tag_g_audio tag_s_scene_start_preload tag_s_assets_preload_buckets tag_s_scene_canvas_render
RESUME: Cockpit Start scene — warm critical assets, fire ship-AI welcome cue, audio unlock gesture, transition to Title.

**Kind:** **Canvas** scene (`D23`). Cockpit environment / full-bleed cockpit texture in the shared Three.js view while assets warm.

#### UI


| Element            | Behaviour                                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Background art** | Full-bleed **cockpit interior** (player’s craft — lived-in dash, matching GDD cockpit storytelling). Visible **immediately** (critical path or inlined so Start never opens blank). |
| **Start** button   | Centered. Primary CTA. Enabled when critical preload reports `ready`; if pressed early, shows an in-art **Preparing…** state on the same button (no separate spinner scene).        |
| **Ship AI line**   | After critical ready, play / dispatch `welcome_screen_ready` — the ship AI addressing the player. Mocked this phase (same cue API; silent stub or placeholder OK).                  |


#### Preload (into memory)

While Start is mounted, a single `AssetManager` loads and **retains**:


| Bucket       | Examples                                                                                                        | Priority                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Critical** | Cockpit Start background, `welcome_screen_ready` buffer (or mock handle), core `BALANCE` / sheet JSON, UI fonts | Must complete before welcome fires / leaving Start |
| **Warm**     | Title/Run art, parallax, ship/enemy wire kits, laser SFX, pool seed meshes                                      | As soon as possible; may finish during Title       |
| **Deferred** | Boss themes, rare VFX, rankings chrome                                                                          | After first Run or idle at Title                   |


Do not fetch the same URL twice in one session — cache by id in the loader.

#### Ready → welcome cue

When `criticalReady` becomes true **once** per Start visit:

1. Emit / call `SoundManager.play('welcome_screen_ready')` (or equivalent cue bus).
2. This phase the asset may be a **mock** — the important contract is the cue id fires through the real API so Howler can replace the stub later.
3. **Autoplay policy:** if `AudioContext` is still locked, the cue is **queued** at ready time and plays on the next unlock (normally the Start click) without firing twice.
4. Do not block the Start button on the VO finishing — player may press Start during or after the line.

#### Immersion practices (locked intent)

1. **Cockpit first** — the player feels seated in the ship, not in a download utility. Progress cues stay secondary / diegetic (radio glow, soft dash lights).
2. **Overlap perception with I/O** — preload starts the moment Start mounts (and may begin speculative warm after Login auth).
3. **AI greets when systems are up** — `welcome_screen_ready` marks “ship awake,” not “file downloaded.”
4. **Gesture unlocks the bus** — Start click unlocks audio if needed, drains the welcome queue, then may start BGM; do not rely on naked autoplay.
5. **No blank interstitial** — never swap to a white/black “Loading…” route; stay on cockpit art until Title is mountable.
6. **Fail soft** — warm asset failures log and continue; only critical failures block ready (retry on the button).
7. **Keep it warm** — asset cache survives across Title ↔ Run; Start is not re-entered every run.
8. **Decode off the hot path** — decode audio/images during Start idle so the first Run frame does not hitch.

#### Rules

- Start is reachable only with a valid `AuthSession`.
- Leaving Start requires `criticalReady === true` (button wait or auto-enable).
- `welcome_screen_ready` fires **exactly once** per Start mount when critical becomes ready (queue-play still counts as that one fire).
- Next scene this phase = **Title** (`Q08`).
- `dispose()` removes DOM/listeners; **does not** dispose the shared asset cache; cancel/ignore in-flight welcome if leaving early only after Title transition has begun.

#### Acceptance

- First paint shows **cockpit** art.
- Critical preload completes → `welcome_screen_ready` is dispatched once (mock allowed).
- If audio was locked, Start click plays the queued welcome (still a single logical fire) then can go to Title.
- Second boot with session skips Login and lands on Start with cache reuse when possible.

## Title & Run (`SCENE-03` / `SCENE-04` — canvas)

tag_g_scene_flow tag_s_scene_title_menu tag_s_scene_run_gameplay tag_s_scene_canvas_render
RESUME: **Title** and **Run** are the only post-Start **canvas scene swaps** — shared WebGL view (`D23`).

| Scene | Kind | Role |
| --- | --- | --- |
| **Title** | Canvas | Main menu / hub entry from Start (`SCENE-03`) — Play CTA starts **preparation**; Rankings opens its DOM panel |
| **Run** | Canvas | Active gameplay loop — player ship, combat, parallax (`SCENE-04`) |

#### Rules

- **Title** and **Run** mount/dispose via `SceneManager` on the shared canvas — same lifecycle as Start.
- **Store** tab on Title is **DOM** (`#store-root`, `D34`) — not a canvas scene swap.
- Leaving **Run** on player **DEAD** does **not** mount a canvas Result — hide canvas or dim it and show **`#result-root`** (DOM).
- From Result, **Rankings** is **`#rankings-root`** (DOM) — not a canvas scene.
- Returning to hub after Rankings remounts canvas **Title** (or Start on full cold boot per session rules).

#### Acceptance (canvas portion)

- Start → Title → Run transitions stay on the shared WebGL canvas without full-page reload.
- Run dispose on death tears down gameplay graph; Result DOM takes focus without leaking Run listeners.

## Result & Rankings (`SCENE-04` — DOM)

tag_g_run_meta tag_s_run_result_screen tag_s_scene_result_ui tag_s_scene_rankings_ui
RESUME: End-of-run **Result** and post-run **Rankings** are HTML/CSS shell panels — same JS Bridge pattern as Login/Store (`D34`/`D41`/`D42`).

| Panel | Root id | Authority | Bridge |
| --- | --- | --- | --- |
| **Result** | `#result-root` | `RunResultManager` (run summary, scrap transfer hook) | `ResultUIBridge` |
| **Rankings** | `#rankings-root` | `RankingManager` | `RankingsUIBridge` |

Detail for Rankings tabs, boards, adapters: [`rankings.spec.MD`](./rankings.spec.MD) · `RNK-04`.

#### Result flow (summary)

```text
Run (canvas) — player DEAD
      │
      ▼
RunResultManager.finalizeRun() → submitRun when valid (RNK)
      │
      ▼
show #result-root — elapsed · kills · score · scrap summary
      │
      ├─ Accept / Continue → hide Result → show #rankings-root OR Title
      └─ Rankings CTA → #rankings-root
```

#### Rules

- UI **never** calls platform SDKs or writes Local storage directly — bridges only.
- `#result-root` and `#rankings-root` live in the game shell; **never** visible together with `#login-root`.
- Canvas may show a static/dimmed last frame behind Result; authoritative UI is DOM.
- Rankings **Normal | Survivor** × **W/M/Y/E** tabs are DOM — not canvas quads.

#### Acceptance

- DEAD ends Run canvas loop; Result DOM shows run summary without a canvas scene swap.
- Rankings DOM shows 2 modes × 4 periods with separated local bests (`RNK-04`).
- Rankings → Title remounts canvas hub without full reload.

## Pause overlay (`SCENE-05`)

tag_g_scene_flow tag_g_input tag_g_run_meta tag_s_scene_pause_overlay tag_s_scene_canvas_render
RESUME: Run overlay — freeze sim time, run stats panel, inventory/lab, right-rail Controls/Audio/Graphics/Dev tabs.

**Kind:** **Canvas UI layer** on a live Run (`D21`, `D23`). World graph stays mounted; simulation time is frozen.

**Earliest ship:** as soon as Run is rendering the **player craft** and **parallax** (todo Theme 4b) — do not wait for full combat/meta.

#### Layout

```
+------------------------------------------------------------------+
|  RUN PANEL (near fullscreen)              | RIGHT RAIL (menu)     |
|  elapsed · kills · score                  | Controls              |
|  Inventory (Use / Drop)                   | Audio                 |
|  Lab (Craft)                              | Graphics              |
|  (more run fields — Q09)                  | Dev (DEV only)        |
|                                           | [Resume / …]          |
+------------------------------------------------------------------+
```

Canvas may remain faintly visible behind a dimmer; the pause window occupies **most** of the viewport.

#### Run panel (locked fields this pass)


| Block            | Behaviour                                                                           |
| ---------------- | ----------------------------------------------------------------------------------- |
| **Elapsed time** | Run clock frozen at open                                                            |
| **Kills**        | Current run kill count                                                              |
| **Score**        | Current run points                                                                  |
| **Inventory**    | Item list with **Use** and **Drop** actions (wire stubs OK until item systems land) |
| **Lab**          | Craft slot UI (choose / progress / block second craft — stubs OK until craft theme) |
| **More**         | Additional run stats deferred (`Q09`)                                               |


#### Right rail → in-overlay tabs

Selecting a rail item opens a **panel/tab inside Pause** (same overlay; not `window.open`).


| Rail         | Opens                                                | Contents                                                                                                                                           |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Controls** | Controls tab                                         | Scheme picker + **physical→virtual** remap (`InputManager`, [`input.spec.MD`](./input.spec.MD) `CTRL-02`/`CTRL-03`). Four schemes: Keyboard · Mix · Gamepad · Touch. Pause remap + combat bindings; mix mouse-steer options; touch slot assigns + fixed pause button. |
| **Audio**    | Audio tab                                            | Driven by `SoundManager`: Music volume · SFX volume · **Mute** · **Mute ship AI** · **Show Audio as Text Log**                                     |
| **Graphics** | Graphics tab                                         | **Screen size** / viewport mode · **Free Cam** (`CAM-06`, [`world.spec.MD`](./world.spec.MD)) — unlocks follow box in Pause **and** live Run. Further rows TBD (`Q10`) |
| **Dev**      | Dev tab (**DEV builds only** — hidden in production) | Live **Balancer** editors bound to the running game’s `BALANCE` / sheet data, split into **inner tabs** by domain (ship, weapons, spawn, squad, …). **Not** `/dev/*` content CRUD — see [`dev-tools.spec.MD`](./dev-tools.spec.MD) (`D43`). |


#### Time freeze

- On open: set loop / RunState to **paused**. `GameLoop.beforeFrame` polls `InputManager` for the **`Start`** edge outside the sim gate, including zero-tick frames; rAF paints the frozen snapshot + overlay. `RunScene` does not poll input or step gameplay (part C).
- On close (Exit / pause toggle): clear pause; **no dt catch-up** burst.
- Input: **only** virtual **`Start`** (from bound physical pause controls per [`input.spec.MD`](./input.spec.MD) `CTRL-02`) toggles Pause while Run is active. **No hardcoded Esc or gamepad Start** in `game-app`. **IJKL/UO** are never pause keys — when Free Cam is on they fly the camera behind the overlay.
- POC3 interim: near-fullscreen **DOM** pause panel (React) with tabs Controls · Audio · Graphics · Dev; frozen Run canvas visible behind dimmer (`HUD` dimmed). Exit button **#pause-exit**; DOM keyboard/gamepad navigation per `CTRL-03` (`pause-menu-nav.ts`).

#### Rules

- Pause cannot open outside Run.
- Dev rail compiled out or gated by `import.meta.env.DEV` (or equivalent).
- Inventory Use/Drop and Lab must not mutate sim while frozen except through explicit pause-safe commands (queue until unpause if needed — default: allow inventory/lab edits that only touch inventory/craft state).
- Closing a side tab returns to the run panel view; closing Pause resumes the run.
- `dispose()` of Pause removes overlay DOM only — never disposes Run’s Three.js graph.

#### Acceptance

- With ship + parallax on screen, pause freezes motion; overlay shows elapsed / kills / score.
- Right rail opens Controls, Audio, Graphics panels; Dev visible only in DEV.
- Audio tab exposes music, SFX, mute, mute ship AI, text log toggle.
- Unpause continues the same run pose with no teleport/catch-up.
- Graphics **Free Cam** on: camera fly works while paused; after Resume the unlock **stays on** until toggled off.
