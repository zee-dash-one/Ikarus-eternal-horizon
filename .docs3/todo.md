# Docs3 / POC3 — development todo

> Tracker for **`poc3/`**, ordered like a vertical-slice shmup build: foundation → feel → sheet → combat → pressure → meta.
> Design authority: [`planning.spec.MD`](./plans/planning.spec.MD) (index) + theme specs in [`plans/`](./plans/) (English). Docs2 = coverage checklist only.
>
> **How to read a line:** feature · requirement ID · notes  
> Tick only when DoD holds: spec (when present) · failing test first · green `npm run verify` in `poc3/`.  
> **Agents:** Orchestrator · Programming/Three.js · Game Design · TDD (see `.cursor/rules/poc2-sdd-agents.mdc`).
>
> Hard runtime rule: **Summary Sheet only** per frame (`D07`). Full Sheet recalc is event-driven (`CHAR-05`).
> **Naming (`D22`):** domain owners are `*Manager` only — never `*Controller` / `*Resolver` (see hub §2.6).
> **Scenes (`D23`):** **Login** is HTML/CSS shell (`D41`); **Start · Title · Run · Result · Rankings · Pause** render in the **shared canvas**. **Store** is also DOM (`D34`).

---

## Theme 0 — Project scaffold

Stand up the playable shell before any gameplay systems. **Login** = HTML shell (`D41`); **Start through Pause** = shared canvas (`D23`). Stack authority: [`architecture.spec.MD`](./plans/architecture.spec.MD) (`D38`) · [`login.spec.MD`](./plans/login.spec.MD).
**SDD opened:** `.docs3/specs/arch/ARCH-01.spec.ts` · `ARCH-02` · `ARCH-08` · `ARCH-16` · `ARCH-17` · `ARCH-18` · `ARCH-19` · `ARCH-20` (red until `poc3/` + `demo-host/` exist). Do not tick until `npm run verify` in `poc3/` is green.

- [x] Scaffold `poc3/`: Vite + TypeScript + eslint + vitest + **dexie**, folder tree per `D40` (`core` · `systems` · `gameobjects` · `scenes` · `render` · `ui` · `pools` · `platform` · `persist`)
- [x] **Core/View split (`D40`):** `GameLoop` fixed tick + `WorldSnapshot`; Input → Commands; View `syncRender` on rAF
- [x] **Golden Rule guardrails (`ARCH-16`/`ARCH-20`):** merge [`.docs3/templates/eslint-sim-boundary.snippet.js`](./templates/eslint-sim-boundary.snippet.js) into `poc3/eslint.config.js`
- [x] Lint/grep gate: `npm run verify` fails on `three`/`window`/`document`/`render/` imports under `core/` · `systems/` · `gameobjects/`
- [x] Game shell layout: `#login-root` (DOM) + shared WebGL canvas + `#store-root` stub (DOM) · `D41`/`D34`
- [x] Shared WebGL / Three.js canvas + `SceneManager` (dispose outgoing → mount next) — **Start through Pause** on canvas
- [x] Optional DEV chrome (`debugger-area`) may stay DOM; **game scenes do not**
- [x] Dexie DB schema stub for Local ACH / RNK mirrors / store cache · `D39` · `ARCH-08`
- [x] `npm run verify` (typecheck + lint + test) green on empty/smoke suite
- [x] Specs folder + [`_templete-spec.spec.MD`](./specs/_templete-spec.spec.MD) under `.docs3/specs/` (see [`specs/README.MD`](./specs/README.MD) §3.1)
- [x] Scaffold sibling `demo-host/` (Node + Hono + SQLite stubs) — not imported by itch/poki/steam · `ARCH-02`

**Done when:** `poc3` boots a canvas and can swap canvas scenes without leaking GPU/listeners.

---

## Theme 0b — Login (auth gate)

[`login.spec.MD`](./plans/login.spec.MD) · `SCENE-01` · `AUTH-*` · `D19` · `D41` · `D38`.
**SDD opened:** `.docs3/specs/auth/AUTH-01.spec.ts` … `AUTH-10` · `scenes/SCENE-01.spec.ts` · `arch/ARCH-05.spec.ts` (red until `poc3/` + DemoHost auth). Do not tick until `npm run verify` green.

- [x] `#login-root` HTML/CSS panel + `LoginUIBridge` (mirror Store bridge pattern · `D34`)
- [x] `AuthManager` + `setPlatformAdapter` — platform-blind authority
- [x] `DemoAuthAdapter` → DemoHost `/api/auth/*` + `/api/me` (`ARCH-05`)
- [x] Password path: mock auth — **always succeeds** when both fields non-empty → hide Login → **Start**
- [x] **Continue with Google**: `window.open` OAuth URL; shell stays on Login until `probeSession()` ok
- [x] Persist/restore session via cookie + `/api/me` so cold boot **skips Login** (`Q06` / `D38`)
- [x] Boot: no session → show `#login-root`; session ok → hide Login → Start (no flash)
- [x] CSS states: `.login--busy` · `.login--error` · `AUTH-08`
- [x] Spec + tests · `SCENE-01` · `AUTH-01`–`10` · `ARCH-05`

**Done when:** Google auth → Start; returning player skips Login on Demo HTTPS origin; no canvas Login scene.

---

## Theme 0c — Start scene (preload + immersion)

Hub §2.5 · §7.6 · `SCENE-02` · `D20` · `D23`. Cockpit art, centered Start, warm assets, ship-AI welcome — **all on canvas**.
**SDD opened:** `.docs3/specs/scenes/SCENE-02.spec.ts` (red until `poc3/` StartScene + AssetManager). Do not tick until `npm run verify` green.

- [x] `StartScene` (canvas): full-bleed **cockpit** background + centered **Start** button
- [x] `AssetManager` / bundle: critical · warm · deferred buckets (`Q07`)
- [x] Preload starts on Start mount (music, art, BALANCE/data, fonts)
- [x] Cache by asset id — no double-fetch in session
- [x] Start enabled when `criticalReady`; early press → in-button **Preparing…**
- [x] On critical ready: fire cue **`welcome_screen_ready`** once (mock via `SoundManager` API OK; queue if audio locked)
- [x] Start click = audio unlock (drain welcome queue if needed) + go to **Title** when ready
- [x] Shared asset cache survives Start `dispose()`
- [x] Spec + tests · `SCENE-02`

**Done when:** cockpit Start warms critical assets; `welcome_screen_ready` fires once at ready; Start enters Title without a spinner scene.

---

## Theme 0d — Dev content CRUD (`/dev/*`)

[`dev-tools.spec.MD`](./plans/dev-tools.spec.MD) · `DEV-*` · `D43` · `BLD-05`.
**SDD opened:** `.docs3/specs/dev/DEV-01.spec.ts` … `DEV-05` · `DEV-07` (red until `poc3/` Dev CRUD). `DEV-06`/`08`–`11` not opened. Do not tick until `npm run verify` green.

- [ ] SPA routes **`/dev/equips`** · **`/dev/buffs`** · **`/dev/enemies`** · **`/dev/squads`** (+ optional `/dev` index) — equips is **one** page; `equipType` required (`generic` + 12 Special)
- [ ] `#dev-crud-root` shared HTML/CSS chrome + `DevCrudBridge` (mirror Login/Store pattern)
- [ ] `DevContentManager` — filter · list · create · update · delete per entity kind
- [ ] `DevContentStore` (Dexie) — **separate** from player profile persist (`D39`)
- [ ] PROD build: routes unreachable / bundle stripped (`BLD-05`)
- [ ] Enemy form: class + strategy defaults (`ENEMY-01`/`ENEMY-03`) · Squad: formation + 1–8 members (`SQUAD-01`)
- [ ] Equip form: required `equipType` (`generic` \| 12 Special ids · `CHAR-01`) · grants stub until `DEV-10` (`EQP-01` types locked)
- [ ] `exportAll()` → content JSON for game boot (`DEV-06`)
- [ ] Spec + tests · `DEV-01`–`05` minimum

**Done when:** DEV build CRUDs enemies and squads in Dexie; export produces loadable JSON; PROD has no `/dev` routes.

---

## Theme 1 — Engine core

Numbers, time, input, memory — nothing allocates per frame on hot paths.
**SDD opened:** `.docs3/specs/input/CTRL-01.spec.ts` · `.docs3/specs/balance/RUL-12.spec.ts` (red until `poc3/` InputManager + `core/balancer.ts`). `GameLoop` tick/pause = [`ARCH-17`](./specs/arch/ARCH-17.spec.ts). Do not tick until `npm run verify` green.

- [x] `BALANCE` single authored-value source (Core sim **and** canvas View paint) · `RUL-12` · `D46`
- [x] Math helpers + scratch vectors · zero alloc
- [x] `GameLoop`: rAF, `dt` clamp, pause gate
- [x] `ObjectPool<T>`: acquire/release, exhaustion → `null`
- [x] `InputManager` + virtual pad (`CTRL-01` §2.8): tokens `Up`/`Down`/`Left`/`Right`/`Start`/`A`/`B`/`X`/`Y`/`R1`/`R2` + `moveX`/`moveZ`
- [x] Four exclusive scheme adapters: **Keyboard** · **Mix** (keyboard+mouse) · **Gamepad** · **Touch** (nipplejs via `TouchInputAdapter` — no nipple import in `InputManager`)
- [x] Default scheme **Keyboard**; switch on Pause → Controls tab
- [x] Remap tables in `BALANCE.controls` map physical → virtual only

**Done when:** loop runs stable; input schemes switch on pause; pools do not grow the heap under fire tests.

---

## Theme 2 — World presentation

Camera and space before the ship has meaning. Hub [`world.spec.MD`](./plans/world.spec.MD) · `CAM-01`–`06` · `RUL-02` · `D44`.
**SDD opened:** `.docs3/specs/world/CAM-01.spec.ts` … `CAM-06` · `RUL-02.spec.ts` (red until `poc3/` CameraManager + letterbox + parallax). Presentation keys on `BALANCE` (`D46`). Do not tick until `npm run verify` green.

- [x] Landscape **16:9** renderer + letterbox + relative paths (`CAM-01` · `D44` · `Q43`)
- [x] Perspective camera (readable top / side / thrusters) · `CAM-02`
- [x] Limit / follow box (dead-zone, bounce, recenter) · `CAM-03`
- [x] 3 Parallax field (distinct layer speeds) · `CAM-04`
- [x] Playfield bounds + off-area despawn (shots/meteors/drops/enemies recycle) · `RUL-02`
- [x] Dev gizmos (toggle; DEV-only) · `CAM-05`
- [x] **Free Cam** (Pause → Graphics toggle): unlock follow box in live Run **and** while paused; IJKL/UO fly · `CAM-06`

**Done when:** empty craft (or placeholder mesh) reads clearly in motion against parallax; off-field entities recycle.

---

## Theme 3 — CHAR sheet (new model)

Build the craft data plane **before** wiring guns and AI. Hub [`char-sheet.spec.MD`](./plans/char-sheet.spec.MD) · `CHAR-01`…`CHAR-06`.
**SDD opened:** `.docs3/specs/char/CHAR-01.spec.ts` … `CHAR-06.spec.ts` (red until `poc3/` CharSheetManager + DamageManager). `CHAR-06-combat` = Theme 5 reuse — not opened. Do not tick until `npm run verify` green.

- [x] Full Sheet: 12 Special + 21 Generic + 21 Effect slots · `CHAR-01`
- [x] Attribute families + op order (`D09`/`D10`) · `CHAR-02`
- [x] Summary Sheet publish (`ENE` `SHD` `DEF` `MIT` `SPD` `S_D` `S_R` `REG` `LVL` `HP` + `integrityState`) · `CHAR-03`
- [x] Recalc triggers: equip → full; effect → summary only; `LVL` → `DEF`/`MIT`/`SPD`/`S_D` · `CHAR-05`
- [x] Integrity states LIGHT → MEDIUM → SEVERE → **DRIFTING** → **DEAD** · `CHAR-04`
- [x] Damage pipeline: precompute `MIT = DEF/10` on recalc; hit uses `MIT` → Shield → Integrity (`D24`); collision `D14`; ship–ship other `HP/2` · `CHAR-06`
- [x] Frame systems **forbidden** from reading Full Sheet fields (tests assert)

**Done when:** equip change republishes Summary; Integrity 0 drifts; next hit kills; no Full Sheet reads in update loops.

---

## Theme 4 — Player craft & control

Motion and presentation consume **Summary** only.
**SDD opened:** reuse `equipment/EQP-02.spec.ts` only — no formal IDs for PlayerManager/EnergyManager/View craft (implementation checklist). Do not tick until `npm run verify` green.

- [x] Player craft as `THREE.Group` (modular mounts map to Special slots)
- [x] `PlayerManager`: force motion / tilt / dash from virtual pad (`moveX`/`moveZ`, `R1`) gated by Summary `SPD` + integrity multipliers
- [x] `EnergyManager`: spend/regen from Summary `ENE`/`REG` (weapons/dash)
- [x] Dash Special slot: contextual deflection (or other `when: dashing` grants) + spin/SPD (`EQP-02`)
- [x] Debugger: Summary + slot sheet live (DEV)

**Done when:** ship flies with readable inertia/bank; damage states visibly slow movement.

---

## Theme 4b — Pause canvas UI (ship + parallax live)

Hub §2.5 · §7.7 · `SCENE-05` · `D21` · `D23`. Ship as soon as Run renders **player craft + parallax** — do not wait for Theme 10.
**SDD opened:** `.docs3/specs/scenes/SCENE-05.spec.ts` (red until `poc3/` Pause overlay). Do not tick until `npm run verify` green.

- [x] Minimal Run mount that owns camera / parallax / player craft (if not already from Themes 2–4)
- [x] Pause toggle (Esc / Start / pause action) **freezes** sim time — no world `dt`
- [x] Near-fullscreen **canvas** pause UI + dimmed frozen Run behind
- [x] Run panel: **elapsed** · **kills** · **score** (stub counters OK)
- [x] Run panel: **Inventory** with Use / Drop (stubs OK)
- [x] Run panel: **Lab** craft UI (stubs OK)
- [x] Right rail: **Controls** → scheme picker + physical→virtual remap (`InputManager`, §2.8)
- [x] Right rail: **Audio** → `SoundManager`: music · SFX · mute · mute ship AI · Show Audio as Text Log
- [x] Right rail: **Graphics** → screen size + **Free Cam** (`CAM-06`) + further rows (`Q10`)
- [x] Right rail: **Dev** (DEV only) → live Balancer editors with **inner tabs** by domain
- [x] Resume / unpause: same pose, no dt catch-up; pause UI `dispose` does not tear down Run
- [x] Spec + tests · `SCENE-05`

**Done when:** pausing mid-flight freezes ship/parallax; canvas pause UI shows run stats + four rail tabs; Dev hidden in production builds.

---

## Theme 5 — Combat loop (shoot & resolve)

Vertical slice: fire → hit → shield/hull risk. Hub [`weapons.spec.MD`](./plans/weapons.spec.MD) · `WPN-01` · `WPN-02` · `WPN-05` · `CHAR-06`.
**SDD opened:** `.docs3/specs/weapons/WPN-01.spec.ts` · `WPN-02` · `WPN-05` · `char/CHAR-06-combat.spec.ts` (reuse `CHAR-06` · `RUL-02`). Do not tick until `npm run verify` green.

- [ ] Pooled player shots + `ShotManager` · `WPN-01`
- [ ] Primary weapon (Laser) via `Primary_Weapon` slot; cadence from `S_R`, damage from `S_D` · `WPN-01`
- [ ] `FiringManager`: virtual `A`/`B`/`X`/`Y` → fire / bomb / switch weapon / switch bomb; energy gate · `WPN-05` (`B`/`X`/`Y` may no-op until Theme 11)
- [ ] `CollisionManager` (layer matrix is data · `D14`) · `WPN-02`
- [ ] `DamageManager` sole `applyDamage` path · `CHAR-06` · `WPN-02`
- [ ] Player DEAD ends the run (hook for Theme 10)
- [ ] Off-field shot recycle · `RUL-02`

**Done when:** holding fire drains `ENE`, bolts hit, shield drains before integrity, DRIFTING→DEAD works in play.

---

## Theme 6 — Environmental pressure (meteors)

Obstacles before smart enemies. Hub [`meteors.spec.MD`](./plans/meteors.spec.MD) · `MET-01`–`04` · `RUL-02`.
**SDD opened:** `.docs3/specs/meteors/MET-01.spec.ts` … `MET-04` (`MET-05` = Theme 13). Do not tick until `npm run verify` green.

- [ ] Meteor objects (S/M/L), pooled, layer `Meteor` · `MET-01`
- [ ] `MeteorManager` spawn / drift / despawn · `MET-02`
- [ ] Shot damage + contact damage through `DamageManager` · `MET-03`
- [ ] Optional split on large destroy · `MET-04`
- [ ] Basic pooled destruction VFX · `MET-05` (Theme 13 juice OK as stub)

**Done when:** meteors occupy lanes, can be shot or dodged, and contact hurts the craft.

---

## Theme 7 — Resources & collection

Hub [`drops.spec.MD`](./plans/drops.spec.MD) · `RES-01`–`03` · `D32`.
**SDD opened:** `.docs3/specs/drops/RES-01.spec.ts` · `RES-02` · `RES-03` · `crafting/RES-05.spec.ts` (`RES-04` defer Theme 12). Do not tick until `npm run verify` green.

- [ ] `DropManager` + loot tables on meteor/enemy kill (Metal Scrap first) · `RES-01`
- [ ] Pooled `Drop` fragments + magnet radius · `RES-02` · `RES-03`
- [ ] Collect → `InventoryPort.tryAdd` + SFX/UI tick
- [ ] Run inventory stacks (Metal Scrap cap stub) · `RES-05` ([`crafting.spec.MD`](./plans/crafting.spec.MD))
- [ ] Full five-type loot table · `RES-04` (defer until Theme 12)

**Done when:** wreckage magnet-pulls in, inventory ticks, pool stays bounded.

---

## Theme 8 — Enemies (individual)

Hub [`enemy.spec.MD`](./plans/enemy.spec.MD) · `ENEMY-01`…`ENEMY-03`.
**SDD opened:** `.docs3/specs/enemy/ENEMY-01.spec.ts` · `ENEMY-02` · `ENEMY-03` (data contract; EnemyManager spawn/pool = implementation). Do not tick until `npm run verify` green.

- [ ] Enemy craft = CHAR sheet + Enemy Base (`Id`, `Strategy`, `Ticks`) · `ENEMY-01`
- [ ] Class kits: Tanker / Warrior / Rogue (+ Special stub) · `ENEMY-03` · `D18`
- [ ] Individual SM: `EnterGate` · `FindGroup` · `LoopBack` · `Flee` · `Fury` · `ENEMY-02`
- [ ] `EnemyManager`: pooling + spawn volumes + gate waypoint
- [ ] Enemy contact / optional `EnemyShot` through `DamageManager`
- [ ] Silhouette legible <0.3s (wireframe OK)

**Done when:** a Warrior enters via gate, can Flee/Fury, dies to shots, and can hurt the player.

---

## Theme 9 — Squads (coordination)

Hub [`squad.spec.MD`](./plans/squad.spec.MD) · `SQUAD-01`…`SQUAD-04`. Independent from enemy SM (`D16`).
**SDD opened:** `.docs3/specs/squad/SQUAD-01.spec.ts` … `SQUAD-04` (data contract; SquadManager runtime = implementation). Do not tick until `npm run verify` green.

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
**SDD opened:** `scenes/SCENE-03` · `SCENE-04` · `run-meta/SCENE-04-result` · `rankings/RNK-01` · `RNK-02` · `RNK-04` · `hud/HUD-01`–`04` (`RNK-05`/`12` = Theme 14). Do not tick until `npm run verify` green.

- [ ] RunState + score/kills; `RankingManager` + `LocalRankingAdapter` · `RNK-01` (§2.10)
- [ ] HUD: Integrity / Shield / Energy (+ radio slot stub); mode high-score strip · `HUD-01`–`04` ([`hud.spec.MD`](./plans/hud.spec.MD))
- [ ] Title → Run → Result → Rankings flow · `SCENE-03` / `SCENE-04` Rankings canvas · `RNK-04`
- [ ] Player DEAD → Result with summary → `submitRun` when valid · `RNK-01`
- [ ] UTC period buckets W/M/Y/E on client · `RNK-02`
- [ ] Gate: Run unreachable without auth + Start preload complete · `SCENE-01` / `SCENE-02`
- [ ] Pause already shipped in Theme **4b** (`SCENE-05`) — extend run-panel fields (`Q09`) here as systems land

**Done when:** death returns a result screen, local Eternal best persists, and a new run starts clean.

---

## Theme 11 — Weapon & ordnance variety

Widen the gun fantasy after the loop is honest. Hub [`weapons.spec.MD`](./plans/weapons.spec.MD) · `WPN-03`–`06`.
**SDD opened:** `.docs3/specs/weapons/WPN-03.spec.ts` · `WPN-04` · `WPN-06` (reuse `WPN-05` from Theme 5). Do not tick until `npm run verify` green.

- [ ] Secondary weapon slot + switch · `WPN-03`
- [ ] Plasma / Beam / Mjolnir (distinct profiles; Summary-fed) · `WPN-04`
- [ ] Special Ordnance (Bomb slot): Pulse Nova · Swarm · Star Killer (charges) · `WPN-06`
- [ ] Energy costs distinct per weapon · `WPN-05`

**Done when:** cycling weapons changes play pattern; bomb has limited charges.

---

## Theme 12 — Equipment, craft, progression

Hub [`equipment.spec.MD`](./plans/equipment.spec.MD) + [`crafting.spec.MD`](./plans/crafting.spec.MD) · `D31`.
**SDD opened:** `equipment/EQP-01`–`03` (data contract) · `crafting/EQP-04` · `EQP-05` (`EQP-06`/`RES-06` defer). Do not tick until `npm run verify` green.

- [ ] Equip item schema: grants any registered `*_mod`/`*_mul` (`EQP-01`)
- [ ] Contextual grants — e.g. `when: dashing` → `deflection_mod` (`EQP-02`)
- [ ] `lab_craft_time_mod` / `lab_craft_time_mul` reduce craft duration (`EQP-03`)
- [ ] `CraftManager` + exclusive CraftSlot · Pause Lab UI · `EQP-04`
- [ ] Repair recipe (Metal Scrap → Integrity) · `EQP-05` G1
- [ ] G2 recipe stubs (shield recharge, Reactive Panels, ordnance crafts)
- [ ] Equipment items in Generic/Special slots (Quantum Deflectors, Dash coils, …)
- [ ] `EnergyManager`: craft + weapons + dash share Summary `ENE`
- [ ] Skill / tech tree branches (Engineering · Power Flow · Weaponry)
- [ ] Difficulty ramp + milestones 50 / 100 / 500
- [ ] Epic Equipment drop as inventory item · `RES-06`

**Done when:** a mid-run repair or craft choice matters and milestones change pressure.

---

## Theme 13 — Juice, audio, packaging

Hub [`builds.spec.MD`](./plans/builds.spec.MD) · [`architecture.spec.MD`](./plans/architecture.spec.MD) · `D37`/`D38` · `BLD-*` · `ARCH-*`.
**SDD opened:** `meteors/MET-05` · `builds/BLD-01`–`03` · `05`–`06` · `08`–`11` · `arch/ARCH-03` · `04` · `06` · `09`–`14` (skip `BLD-04`/`07` · `ARCH-07`/`15` defer). Juice/audio/haptics todo lines have **no formal IDs**. Do not tick until `npm run verify` green.

- [ ] VFX: hit flash, shake cap, vignette, pooled bursts
- [ ] Howler SFX/music + overheat/radio cues
- [ ] Haptics presets (gamepad scheme)
- [ ] `IKARUS_PLATFORM` + `build:demo|itch|poki|steam` scripts · `BLD-01`–`BLD-02`
- [ ] DemoHost: Zod validation on `/api/store` · ranking integrity + rate limit · CSRF Origin guard · `ARCH-11`/`ARCH-14` · `S6`–`S8`
- [ ] Persist debounce manager (~3s) + Dexie quota toast · `ARCH-12`/`ARCH-13`
- [ ] Demo `dist-demo/` + DemoHost behind Caddy · `BLD-06` · `BLD-08` · `ARCH-03`
- [ ] Manual deploy: rsync `dist-demo/` + restart Node · Litestream/cron backup · `ARCH-06`/`ARCH-15` · `Q33`
- [ ] Steam shell (**Tauri**) + `@tauri-apps/plugin-fs` JSON saves + Cloud · `BLD-11` · `ARCH-09` · `D39`
- [ ] Itch zip `dist-itch/` · Poki `dist-poki/` (Poki SDK cloud save) · Steam `dist-steam/` · `BLD-03` · `BLD-09`/`BLD-10`
- [ ] Production strip Dev rail + DEV debug camera · `BLD-05` (keep Graphics **Free Cam**)
- [ ] Worst-case frame stability (Mega + full wave)
- [ ] (defer) GitHub Action SSH deploy · `ARCH-07`

**Done when:** hits read, audio warns, Demo opens over HTTPS via Caddy+DemoHost; four build scripts exist.

---

## Theme 14 — Modes, boards, ship (later)

- [ ] `AchievementManager` + virtual apiName port · `ACH-01`–`ACH-02` (§2.9)
- [ ] `LocalAchievementAdapter` always on · `ACH-03`
- [ ] `ItchAchievementAdapter` · `ACH-04`
- [ ] `PokiAchievementAdapter` · `ACH-05`
- [ ] Boot platform detect · `ACH-07`
- [ ] `RankingManager` + `RankingPlatformAdapter` per build · `RNK-01`–`RNK-05` · `RNK-12` · `D30`/`D38`
- [ ] `LocalRankingAdapter` always mirrors · 8-board matrix · `RNK-01`–`RNK-02`
- [ ] `DemoRankingAdapter` → DemoHost `/api/rankings` · `D38` · `BLD-08`
- [ ] `ItchRankingAdapter` · `RNK-10`
- [ ] `PokiRankingAdapter` · `RNK-11`
- [ ] Survivor mode (one-shot, laser-only v1) · `RNK-03` · `Q11`
- [ ] `SteamRankingAdapter` — 8 `LB_*` boards, KeepBest · `RNK-06`–`RNK-08`
- [ ] Offline upload queue + sync · `RNK-07`
- [ ] Cosmetic rank title/badge · `RNK-09` · `Q13`
- [ ] `StoreManager` + `StoreUIBridge` (HTML hub tab) · `STR-01`–`STR-04` · `D33`/`D34`
- [ ] Profile wallet (**BUD** `bud` + transferred scrap) · Title/hub only · `Q23`/`Q24`
- [ ] `LoginStreakManager` weekly claim · 5/10/15/20/25/30/60 BUD · `STR-07`–`09` · `D35`
- [ ] `StorePlatformAdapter` wire — Demo=`DemoStoreAdapter` · Itch · Poki · Steam · `STR-10`–`13` · `D36`/`D38`
- [ ] `PlatformKit` boot wire (ACH + RNK + Store same kit) · `BLD-04` · `D37`
- [ ] Persistent remap + Steam Input (G3)
- [ ] `SteamAchievementAdapter` · `ACH-06` · icons/copy · `ACH-08`–`ACH-09`
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
