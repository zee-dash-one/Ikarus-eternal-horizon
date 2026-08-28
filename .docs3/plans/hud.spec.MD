# Ikarus Eternal Horizon — Combat HUD

tag_g_player_ship tag_s_player_hud_fields tag_g_run_meta tag_s_run_hud_combat
RESUME: Canvas HUD on Run — floating Integrity/Shield/Energy from Summary; border score/kills/high; weapon + ordnance chips; View-only.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.16

**Related:** [`char-sheet.spec.MD`](./char-sheet.spec.MD) (Summary + integrity states) · [`scenes.spec.MD`](./scenes.spec.MD) (Pause run panel is **not** this HUD) · [`rankings.spec.MD`](./rankings.spec.MD) (mode high-score) · [`weapons.spec.MD`](./weapons.spec.MD) (weapon chip · charges) · [`world.spec.MD`](./world.spec.MD) (letterbox-safe projection)

Coverage: docs2 `META-` (HUD) · `SDD-G07`. Pause overlay stats stay `SCENE-05`.

---

## Ownership

tag_g_run_meta tag_s_run_hud_combat tag_s_run_hud_border
RESUME: HudManager is View-only — reads WorldSnapshot / Summary; never mutates Core.

| Owns | Does **not** own |
| --- | --- |
| Floating bars (Integrity · Shield · Energy) | CHAR math (`CHAR-03`/`CHAR-04`) |
| Border strip (score · kills · mode high) | Score authority (`RankingManager` / run counters) |
| Weapon / ordnance / radio **presentation** | Fire logic (`FiringManager`) |
| Hit flicker / vignette **request** to View | `applyDamage` (`DamageManager`) |

**Kind:** **Canvas overlay on Run** (`D23`, `D45`) — CSS2D / screen-space sprites / world→screen project. **Not** `#login-root` / `#result-root` DOM.

**Pause:** `SCENE-05` run panel shows elapsed / kills / score as a **frozen pause UI**. Combat HUD may hide or dim while paused; it must not become a second score authority.

---

## POC3 slice layout (v0 — corner modules first)

tag_g_run_meta tag_s_run_hud_combat tag_s_run_hud_border
RESUME: Four corner text modules on Run; monospaced cyan terminal chrome; center Integrity/Shield/Energy **rings deferred**.

Reference mock (GDD intent):

```
┌─ TOP-LEFT: Status & Comms ─────────┐   ┌─ TOP-RIGHT: Gameplay Stats ─┐
│ [PILOT STATUS: OPERATOR - IKARUS…] │   │ [SCORE: 0098450]            │
│ [RADIO WAVEFORM ~~~]               │   │ [KILLS: 142]                │
│ AI: "Corruption signatures…"       │   │ [HIGH: 250000]              │
└────────────────────────────────────┘   └─────────────────────────────┘

              (CENTER: Integrity · Shield · Energy — concentric rings on craft)

┌─ BOTTOM-LEFT: Crafting ────────────┐   ┌─ BOTTOM-RIGHT: Loadout ─────┐
│ [CRAFTING SLOT 1/1]                │   │ [PRIMARY: LASER L1]         │
│ Build: [=----] 42% [Plasma…]       │   │ [SPECIAL: NOVA BOMB x3 [●●●]]│
└────────────────────────────────────┘   └─────────────────────────────┘
```

| Corner | Maps to | POC3 |
| --- | --- | --- |
| Top-left | `HUD-03` radio + pilot + AI line | `BALANCE.hud.stubs` · rotating AI copy |
| Top-right | `HUD-02` score / kills / high | `WorldSnapshot.score` · `kills` · local high |
| Bottom-left | `HUD-03` craft slot | Hidden until Theme 12 craft active |
| Bottom-right | `HUD-03` weapon + ordnance | `FiringManager.activeWeapon` · bomb stub |
| **Center** | **`HUD-01` craft rings** | `CraftRingsView` — 3 SVG arcs follow ship via `hud-projector` |

**Implementation:** `poc3/src/render/hud-manager.ts` + `craft-rings-view.ts` + `hud-projector.ts` — DOM/SVG overlay inside `#game-area`. Colors from `BALANCE.hud.rings` (`D46`).

---

## Floating bars (`HUD-01`)

tag_g_player_ship tag_s_player_hud_fields tag_g_char_sheet tag_s_char_summary_sheet
RESUME: Integrity, Shield (Force Field), Energy — Summary Sheet only; integrity state recolors Integrity.

> **POC3:** corner HUD + **center craft rings** (`CraftRingsView`). Rings track Summary fill; integrity tint follows `integrityState` (`CHAR-04`).

| Widget | Reads | Rule |
| --- | --- | --- |
| **Integrity** | `integrity_cur` / `integrity_max` + integrity **state** | Bar fill; tint by LIGHT / MEDIUM / SEVERE / DRIFTING (`CHAR-04`). **DEAD** is not shown — Result DOM takes over (`SCENE-04`) |
| **Shield** | Summary `SHD` vs shield max from snapshot | GDD “Force Field” label OK in copy; code id is `SHD` |
| **Energy** | Summary `ENE` vs energy max | Empty when `ENE` 0 (fire blocked — `WPN-05`) |

| Rule | Detail |
| --- | --- |
| Source | Snapshot / Summary **only** (`D07`) — never Full Sheet |
| Follow | World→screen of player craft; **letterbox-safe**; clamp to playfield margins (`CAM-01`) |
| Hit flicker | On `DAMAGE_APPLIED`, flicker the bar that absorbed (shield vs integrity) — one event, one flicker |
| Mutate | HUD **never** writes sheet fields |

---

## Border strip (`HUD-02`)

tag_g_run_meta tag_s_run_hud_border tag_s_run_stats_panel
RESUME: Fixed chrome — score, kills, current-mode high score; radio waveform slot.

| Field | Source |
| --- | --- |
| Score | Run counter (Theme 10 `RunState`) |
| Kills | Run counter |
| High | Local best for **current mode** (`RNK-01`) — not a mixed board |
| Radio | Waveform slot for ship-AI / Ikarus barks (`SoundManager` cue log). Theme 10 may stub a silent widget; Theme 13 fills audio |

GDD layout (design intent, not CSS):

```
SCORE | KILLS                          HIGH
[RADIO waveform]
         Integrity / Shield / Energy   (floating, not this strip)
         Weapon | Ordnance ×N | Craft%
```

---

## Weapon · ordnance · radio (`HUD-03`)

tag_g_combat tag_s_combat_weapon_fire tag_g_audio tag_s_audio_cue_dispatch
RESUME: Equipped weapon id, bomb charges, radio stub — presentation only.

| Chip | Reads |
| --- | --- |
| Weapon | `FiringManager.activeWeaponId()` (catalog id → display name in `BALANCE`) |
| Ordnance | Active bomb id + remaining charges (`WPN-06`; Theme 5 shows `×0` or hides) |
| Craft | CraftSlot progress % when a craft is running (`EQP-04`) — Theme 12; Theme 10 stub OK |
| Radio | Cue id / “playing” flag — no dialogue tree, no pause (`Q47`) |

---

## View contract (`HUD-04`, `D45`)

tag_g_engine tag_s_engine_core_view_split
RESUME: HudManager lives in View; Core tests never import it; one shared projector.

| Rule | Detail |
| --- | --- |
| Layer | `ui/` or `render/hud` — **not** `core/` / `systems/` / `gameobjects/` (`ARCH-16`) |
| Projector | **One** world→screen helper for all floating widgets (no duplicated `project` math) |
| Events | Subscribes to domain events (`DAMAGE_APPLIED`, `WEAPON_SWITCHED`, …) — does not poll Full Sheet |
| Dispose | Run dispose removes HUD listeners; no leak into Result DOM |

---

## `HudManager` contract (sketch)

```
syncRender(snapshot, alpha)  // bars, chips, border numbers
onEvent(evt)                 // flicker / vignette pulse
setVisible(on)               // pause dim / Result hide
dispose()
```

---

## Requirements (`HUD-`)

| ID | Prio | Theme | Requirement | Acceptance |
| --- | --- | --- | --- | --- |
| `HUD-01` | must | 10 | Floating Integrity / Shield / Energy from Summary only | Bars track snapshot; integrity state recolors Integrity; no Full Sheet reads |
| `HUD-02` | must | 10 | Border score / kills / mode high-score | Counters match RunState; high is current-mode local best |
| `HUD-03` | should | 10 | Weapon chip + ordnance charges + radio slot | Chip matches `activeWeaponId`; charges match bomb state; radio may stub |
| `HUD-04` | must | 10 | HUD is View-only; one projector; letterbox-safe | Core has zero HUD imports; widgets stay inside letterboxed playfield |

---

## BALANCE keys (feel stubs — Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `hud.fontFamily` / `fontSizePx` / `edgePaddingPx` | Terminal chrome |
| `hud.colors.text` / `dim` / `accent` | Cyan palette |
| `hud.stubs.pilotStatus` / `radioLabel` / `aiLines` | Top-left copy |
| `hud.stubs.bombName` / `bombCharges` | Ordnance chip until `WPN-06` |
| `hud.stubs.defaultHighScore` | Fallback until `RNK-01` local best |
| `hud.barWidth` / `barHeight` | Floating widget size (**deferred**) |
| `hud.colors.integrity.*` | LIGHT → DRIFTING tints (**deferred**) |
| `hud.flickerMs` | Hit flash duration (**deferred**) |
| `hud.edgeClamp` | Screen-edge padding |

---

## Open questions

| # | Question | Default until tuned |
| --- | --- | --- |
| Q47 | Radio waveform: Theme 10 stub vs Howler-driven Theme 13 | **Stub widget** in Theme 10; real waveform Theme 13 |
