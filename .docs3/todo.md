# Docs3 / POC3 — development todo

> Tracker for **`poc3/`**, ordered like a vertical-slice shmup build: foundation → feel → sheet → combat → pressure → meta.
> Design authority: [`planning.spec.MD`](./plans/planning.spec.MD) (English). Docs2 = coverage checklist only.
>
> **How to read a line:** feature · requirement ID · notes  
> Tick only when DoD holds: spec (when present) · failing test first · green `npm run verify` in `poc3/`.  
> **Agents:** Orchestrator · Programming/Three.js · Game Design · TDD (see `.cursor/rules/poc2-sdd-agents.mdc`).
>
> Hard runtime rule: **Summary Sheet only** per frame (`D07`). Full Sheet recalc is event-driven (`CHAR-05`).
> **Naming (`D22`):** domain owners are `*Manager` only — never `*Controller` / `*Resolver` (see hub §2.6).
> **Scenes (`D23`):** Login · Start · Title · Run · Result · Rankings · Pause all render in the **shared canvas**.

---

## Theme 0 — Project scaffold

Stand up the playable shell before any gameplay systems. **All scene-flow screens render in the shared canvas** (`D23`).

- [ ] Scaffold `poc3/`: Vite + TypeScript + eslint + vitest, folder tree (`core` · `gameobjects` · `systems` · `scenes` · `ui` · `pools` · `render`)
- [ ] Shared WebGL / Three.js canvas + `SceneManager` (dispose outgoing → mount next) — Login through Pause all on canvas
- [ ] Optional DEV chrome (`debugger-area`) may stay DOM; **game scenes do not**
- [ ] `npm run verify` (typecheck + lint + test) green on empty/smoke suite
- [ ] Specs folder + `_template.spec.ts` under `.docs3/specs/` (multi-agent sections)

**Done when:** `poc3` boots a canvas and can swap canvas scenes without leaking GPU/listeners.

---

## Theme 0b — Login scene (auth gate)

Hub §2.5 · §7.5 · `SCENE-01` · `D19` · `D23`.

- [ ] `LoginScene` **on canvas**: username + password + **Sign in** (canvas UI / CSS2D OK)
- [ ] Password path: mock auth — **always succeeds** when both fields non-empty → **Start**
- [ ] **Continue with Google**: new **browser** tab OAuth; game canvas stays on Login
- [ ] Google return stub marks `AuthSession` → **Start**
- [ ] Persist/restore `AuthSession` so cold boot can **skip Login** (`Q06`)
- [ ] Boot: no session → Login; session ok → Start (no Login flash)
- [ ] Spec + tests · `SCENE-01`

**Done when:** auth → Start on canvas; returning player skips Login.

---

## Theme 0c — Start scene (preload + immersion)

Hub §2.5 · §7.6 · `SCENE-02` · `D20` · `D23`. Cockpit art, centered Start, warm assets, ship-AI welcome — **all on canvas**.

- [ ] `StartScene` (canvas): full-bleed **cockpit** background + centered **Start** button
- [ ] `AssetManager` / bundle: critical · warm · deferred buckets (`Q07`)
- [ ] Preload starts on Start mount (music, art, BALANCE/data, fonts)
- [ ] Cache by asset id — no double-fetch in session
- [ ] Start enabled when `criticalReady`; early press → in-button **Preparing…**
- [ ] On critical ready: fire cue **`welcome_screen_ready`** once (mock via `SoundManager` API OK; queue if audio locked)
- [ ] Start click = audio unlock (drain welcome queue if needed) + go to **Title** when ready
- [ ] Shared asset cache survives Start `dispose()`
- [ ] Spec + tests · `SCENE-02`

**Done when:** cockpit Start warms critical assets; `welcome_screen_ready` fires once at ready; Start enters Title without a spinner scene.

---

## Theme 1 — Engine core

Numbers, time, input, memory — nothing allocates per frame on hot paths.

- [ ] `BALANCE` single source of numbers (sheet stubs, controls, loop, layers, spawns) · `RUL-12` coverage
- [ ] Math helpers + scratch vectors · zero alloc
- [ ] `GameLoop`: rAF, `dt` clamp, pause gate
- [ ] `ObjectPool<T>`: acquire/release, exhaustion → `null`
- [ ] `InputManager`: four exclusive schemes (Keyboard · Mix · Gamepad · Touch), combat vocabulary (move/fire/bomb/switch/dash/pause)

**Done when:** loop runs stable; input schemes switch on pause; pools do not grow the heap under fire tests.

---

## Theme 2 — World presentation

Camera and space before the ship has meaning.

- [ ] Landscape 9:16 renderer + letterbox + relative paths (change Portraitfrom the .docs2)
- [ ] Perspective camera (readable top / side / thrusters)
- [ ] Limit / follow box (dead-zone, bounce, recenter)
- [ ] 3 Parallax field (distinct layer speeds)
- [ ] Dev gizmos (toggle; DEV-only)

**Done when:** empty craft (or placeholder mesh) reads clearly in motion against parallax.

---

## Theme 3 — CHAR sheet (new model)

Build the craft data plane **before** wiring guns and AI. Hub §4 · `CHAR-01`…`CHAR-06`.

- [ ] Full Sheet: 12 Special + 21 Generic + 21 Effect slots · `CHAR-01`
- [ ] Attribute families + op order (`D09`/`D10`) · `CHAR-02`
- [ ] Summary Sheet publish (`ENE` `SHD` `DEF` `MIT` `SPD` `S_D` `S_R` `REG` `LVL` `HP`) · `CHAR-03`
- [ ] Recalc triggers: equip → full; effect → summary only; `LVL` → `DEF`/`MIT`/`SPD`/`S_D` · `CHAR-05`
- [ ] Integrity states LIGHT → MEDIUM → SEVERE → **DRIFTING** → **DEAD** · `CHAR-04`
- [ ] Damage pipeline: precompute `MIT = DEF/10` on recalc; hit uses `MIT` → Shield → Integrity (`D24`); collision `D14`; ship–ship other `HP/2` · `CHAR-06`
- [ ] Frame systems **forbidden** from reading Full Sheet fields (tests assert)

**Done when:** equip change republishes Summary; Integrity 0 drifts; next hit kills; no Full Sheet reads in update loops.

---

## Theme 4 — Player craft & control

Motion and presentation consume **Summary** only.

- [ ] Player craft as `THREE.Group` (modular mounts map to Special slots)
- [ ] `PlayerManager`: force motion / tilt / dash gated by Summary `SPD` + integrity multipliers
- [ ] `EnergyManager`: spend/regen from Summary `ENE`/`REG` (weapons/dash)
- [ ] Dash Special slot behaviour, equipped gains and spins amplifying `SPD` and `DEF`
- [ ] Debugger: Summary + slot sheet live (DEV)

**Done when:** ship flies with readable inertia/bank; damage states visibly slow movement.

---

## Theme 4b — Pause canvas UI (ship + parallax live)

Hub §2.5 · §7.7 · `SCENE-05` · `D21` · `D23`. Ship as soon as Run renders **player craft + parallax** — do not wait for Theme 10.

- [ ] Minimal Run mount that owns camera / parallax / player craft (if not already from Themes 2–4)
- [ ] Pause toggle (Esc / Start / pause action) **freezes** sim time — no world `dt`
- [ ] Near-fullscreen **canvas** pause UI + dimmed frozen Run behind
- [ ] Run panel: **elapsed** · **kills** · **score** (stub counters OK)
- [ ] Run panel: **Inventory** with Use / Drop (stubs OK)
- [ ] Run panel: **Lab** craft UI (stubs OK)
- [ ] Right rail: **Controls** → in-canvas controls config tab (`InputManager`)
- [ ] Right rail: **Audio** → `SoundManager`: music · SFX · mute · mute ship AI · Show Audio as Text Log
- [ ] Right rail: **Graphics** → screen size + TBD graphics rows (`Q10`)
- [ ] Right rail: **Dev** (DEV only) → live Balancer editors with **inner tabs** by domain
- [ ] Resume / unpause: same pose, no dt catch-up; pause UI `dispose` does not tear down Run
- [ ] Spec + tests · `SCENE-05`

**Done when:** pausing mid-flight freezes ship/parallax; canvas pause UI shows run stats + four rail tabs; Dev hidden in production builds.

---

## Theme 5 — Combat loop (shoot & resolve)

Vertical slice: fire → hit → shield/hull risk.

- [ ] Pooled player shots + `ShotManager`
- [ ] Primary weapon (Laser) via `Primary_Weapon` slot; cadence from `S_R`, damage from `S_D`
- [ ] `FiringManager`: fire / switch; energy gate
- [ ] `CollisionManager` (layer matrix is data · `D14`)
- [ ] `DamageManager` sole `applyDamage` path · `CHAR-06`
- [ ] Player DEAD ends the run (hook for Theme 10)

**Done when:** holding fire drains `ENE`, bolts hit, shield drains before integrity, DRIFTING→DEAD works in play.

---

## Theme 6 — Environmental pressure (meteors)

Obstacles before smart enemies.

- [ ] Meteor objects (S/M/L), pooled, layer `Meteor`
- [ ] `MeteorManager` spawn / drift / despawn
- [ ] Shot damage + contact damage through `DamageManager`
- [ ] Optional split on large destroy
- [ ] Basic pooled destruction VFX

**Done when:** meteors occupy lanes, can be shot or dodged, and contact hurts the craft.

---

## Theme 7 — Resources & collection

Feed the repair/craft fantasy later; keep magnet simple now.

- [ ] Drop tables on meteor/enemy kill (Metal Scrap first) · `DropManager`
- [ ] Drop objects, layer `Drop`, magnet radius · `DropManager`
- [ ] Inventory counts on craft (Generic/Collector seam)
- [ ] Collection feedback (SFX cue stub OK)

**Done when:** wreckage magnet-pulls in and inventory ticks.

---

## Theme 8 — Enemies (individual)

Hub §5 · `ENEMY-01`…`ENEMY-03`.

- [ ] Enemy craft = CHAR sheet + Enemy Base (`Id`, `Strategy`, `Ticks`) · `ENEMY-01`
- [ ] Class kits: Tanker / Warrior / Rogue (+ Special stub) · `ENEMY-03` · `D18`
- [ ] Individual SM: `EnterGate` · `FindGroup` · `LoopBack` · `Flee` · `Fury` · `ENEMY-02`
- [ ] `EnemyManager`: pooling + spawn volumes + gate waypoint
- [ ] Enemy contact / optional `EnemyShot` through `DamageManager`
- [ ] Silhouette legible <0.3s (wireframe OK)

**Done when:** a Warrior enters via gate, can Flee/Fury, dies to shots, and can hurt the player.

---

## Theme 9 — Squads (coordination)

Hub §6 · `SQUAD-01`…`SQUAD-04`. Independent from enemy SM (`D16`).

- [ ] `SquadManager`: squad sheet 1–8 · roles Leader/Center/Inner/Outer · `SQUAD-01`
- [ ] Squad SM: `PatrolGrouping` · `PatrolAround` · `LoopBack` · `Approach` · `Break` · `SQUAD-02`
- [ ] Formations `V` · `Circle` · `CircleII`–`IV` · `LineDivers` with class recipes · `SQUAD-03`
- [ ] Triggers `OnBreakGroup` / `OnPatrolGrouping` · `SQUAD-04`
- [ ] Leader rule for `V` (highest `LVL`, tie → lowest `Id`) · `D17`
- [ ] Debugger: Squad + Spawn tabs (DEV)

**Done when:** a mixed or same-class squad holds formation, Break peels Flee/LineDivers, PatrolGrouping can refill.

---

## Theme 10 — Run meta (score, death, scenes)

Close the “one more run” loop.

- [ ] RunState + score/kills; local best
- [ ] HUD: Integrity / Shield / Energy (+ radio slot stub)
- [ ] Title → Run → Result → Rankings flow · `SCENE-03` / `SCENE-04` (detail TBD)
- [ ] Player DEAD → Result with summary
- [ ] Gate: Run unreachable without auth + Start preload complete · `SCENE-01` / `SCENE-02`
- [ ] Pause already shipped in Theme **4b** (`SCENE-05`) — extend run-panel fields (`Q09`) here as systems land

**Done when:** death returns a result screen and a new run starts clean.

---

## Theme 11 — Weapon & ordnance variety

Widen the gun fantasy after the loop is honest.

- [ ] Secondary weapon slot + switch
- [ ] Plasma / Beam / Mjolnir (distinct profiles; Summary-fed)
- [ ] Special Ordnance (Bomb slot): Pulse Nova · Swarm · Star Killer (charges)
- [ ] Energy costs distinct per weapon

**Done when:** cycling weapons changes play pattern; bomb has limited charges.

---

## Theme 12 — Equipment, craft, progression

Longer session systems (hub deferred prefixes).

- [ ] Equipment items filling Generic/Effect slots (Reactive Panels, Deflectors, weapon mules, …)
- [ ] CraftSlot (Lab/Converter): pause to choose, real-time build, 1 slot
- [ ] Repair consuming Metal Scrap
- [ ] Skill / tech tree branches (Engineering · Power Flow · Weaponry)
- [ ] Difficulty ramp + milestones 50 / 100 / 500

**Done when:** a mid-run craft choice matters and milestones change pressure.

---

## Theme 13 — Juice, audio, packaging

- [ ] VFX: hit flash, shake cap, vignette, pooled bursts
- [ ] Howler SFX/music + overheat/radio cues
- [ ] Haptics presets (gamepad scheme)
- [ ] Itch-ready relative `index.html` / responsive shell
- [ ] Worst-case frame stability (Mega + full wave)

**Done when:** hits read, audio warns, build opens from `file://` without absolute paths.

---

## Theme 14 — Modes, boards, ship (later)

- [ ] Survivor mode (one-shot from scratch)
- [ ] Weekly / Monthly / Annual / Eternal boards (UTC; modes never mix)
- [ ] Persistent remap + Steam Input (G3)
- [ ] Achievements / cosmetics / faction reputation (no combat power on boards)
- [ ] Narrative delivery: Bounty Board, AI narrator, sector bands, flavor text

**Done when:** product gates G2/G3 items have a home; not required for first playable slice.

---

## Coverage reminders (docs2 checklist)

Use hub §8 when closing a theme. Do not silently drop: controls schemes, pooling, layers, survivor boards, lore systems.

| Prefer next | Blocked on |
|---|---|
| Theme 0 → **0b Login** → **0c Start** → 1 → 2 → 3 → 4 | — |
| Theme **4b Pause** | Theme 2 (parallax) + Theme 4 (player ship) + Run mount |
| Theme 5 | Theme 3 (Summary Sheet live) |
| Theme 8–9 | Theme 3 + 5 (damage path) |
| Theme 10 | Theme 5 death path + 0b/0c boot |
| Theme 11+ | Theme 5 playable loop |
