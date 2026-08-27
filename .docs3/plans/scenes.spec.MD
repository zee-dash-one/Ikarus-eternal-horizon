# Ikarus Eternal Horizon — Scenes & Boot Flow

tag_g_scene_flow tag_s_scene_canvas_render tag_g_assets tag_g_audio tag_g_run_meta
RESUME: Canvas-rendered Login → Start → Title → Run → Result → Rankings; Pause overlay on Run; SCENE-01/02/05 detail.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

---

## Requirements (`SCENE-`)



| ID         | Prio   | Requirement                                                                                           | Acceptance                                                         |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `SCENE-01` | must   | Login scene; skip when `AuthSession` exists; Google new-tab; mock password always succeeds            | Auth → **Start**; skip path boots straight to Start                |
| `SCENE-02` | must   | Start: cockpit art + centered Start; preload; on critical ready fire `welcome_screen_ready` (mock OK) | Cue fires once at ready; Start unlocks audio if needed; then Title |
| `SCENE-03` | should | Title scene (main menu)                                                                               | Deferred detail — entered from Start                               |
| `SCENE-04` | should | Run / Result / Rankings                                                                               | Run deferred · **Rankings** [`rankings.spec.MD`](./rankings.spec.MD) (`RNK-04`)                      |
| `SCENE-05` | must   | Pause overlay: freeze time; run panel + Controls / Audio / Graphics / Dev tabs                        | Opens once Run shows player ship + parallax; sim frozen while open |


## Login scene (`SCENE-01`)

tag_s_scene_login_auth tag_s_scene_canvas_render

**Kind:** **Canvas** scene (`D23`). Shared Three.js / WebGL view — no full-page HTML shell.

#### Boot

- If a valid `AuthSession` exists → **do not show Login**; `SceneManager` mounts **Start** (`D19`).
- Otherwise Login is the first user-facing scene.

#### UI


| Control                         | Behaviour                                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Username** field              | Text input; required for password path                                                                                             |
| **Password** field              | Masked input; required for password path                                                                                           |
| **Sign in** (username/password) | Mock auth (`D19`) — **always succeeds** when both fields are non-empty. On success → **Start**                                     |
| **Continue with Google**        | Opens Google login / OAuth URL in a **new browser tab**. Game tab stays on Login until session is marked authenticated → **Start** |


#### Rules

- Failed UI validation stays on Login.
- Password path never talks to a real backend this phase.
- Google path must not replace the game document in the same tab.
- Persist or restore `AuthSession { provider: 'password' \| 'google', displayName }` so the next cold boot can skip Login (`Q06`).
- `dispose()` removes listeners and DOM owned by the scene.

#### Acceptance

- Cold boot with session → Start (Login never flashes, or flashes ≤1 frame).
- Cold boot without session → Login; mock Sign in → Start.
- Google button opens a new tab; game tab stays put until authenticated.

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
| **Controls** | Controls tab                                         | Scheme picker + **physical→virtual** remap (`InputManager`, [`input.spec.MD`](./input.spec.MD)). Four schemes: Keyboard · Mix · Gamepad · Touch. |
| **Audio**    | Audio tab                                            | Driven by `SoundManager`: Music volume · SFX volume · **Mute** · **Mute ship AI** · **Show Audio as Text Log**                                     |
| **Graphics** | Graphics tab                                         | **Screen size** / viewport mode; further graphics toggles TBD (`Q10`)                                                                              |
| **Dev**      | Dev tab (**DEV builds only** — hidden in production) | Live **Balancer** editors bound to the running game’s `BALANCE` / sheet data, split into **inner tabs** by domain (ship, weapons, spawn, squad, …) |


#### Time freeze

- On open: set loop / RunState to **paused**; world `update(dt)` does not advance; rAF may keep painting the frozen frame + overlay.
- On close (Resume / pause toggle): clear pause; **no dt catch-up** burst.
- Input: Esc / virtual **`Start`** / pause action toggles Pause while Run is active.

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
