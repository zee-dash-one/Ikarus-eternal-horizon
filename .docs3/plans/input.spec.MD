# Ikarus Eternal Horizon — Input — Virtual Pad

tag_g_input tag_s_input_virtual_pad tag_s_input_device_adapters
RESUME: Device-blind virtual pad; four exclusive scheme adapters (Keyboard · Mix · Gamepad · Touch).

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.22

**Related:** [`architecture.spec.MD`](./architecture.spec.MD) (`D40`) · [`scenes.spec.MD`](./scenes.spec.MD) (`SCENE-05`) · [`balance.spec.MD`](./balance.spec.MD) (`D46` / `RUL-12`)

## Virtual input pad (`CTRL-01`, `D27`)

tag_g_input tag_s_input_virtual_pad tag_s_input_device_adapters
RESUME: Device-blind controls — sim reads only the virtual pad; physical devices are mapped through exclusive scheme adapters.

Gameplay systems (`PlayerManager`, `FiringManager`, Pause gate, …) read **only** the **virtual pad**. They never import keyboard codes, mouse buttons, `Gamepad` indices, DOM events, or **nipplejs**. Physical hardware is normalized by **adapters** inside `InputManager`.

**Core boundary (`D40`):** each UI frame, InputManager translates pad edges/levels into a pure RunInputFrame; RunInputBuffer retains edges until a fixed tick consumes them. Start stays outside sim. Core never reads DOM or Three.js.

#### Virtual vocabulary (locked)

| Kind | Tokens | Rule |
| --- | --- | --- |
| **Directions** | `Up` · `Down` · `Left` · `Right` | Digital edge/level. Adapters also publish analog **`moveX`** / **`moveZ`** ∈ [−1, 1] for stick/nipple/WASD merge (PlayerManager reads axes, not raw hardware). |
| **System** | `Start` | **Pause / unpause** at the gameplay boundary (`GameLoop.beforeFrame` UI boundary). Not a gameplay action token. |
| **Face / shoulders** | `A` · `B` · `X` · `Y` · `R1` · `R2` | Digital actions only |

No other symbols exist at the gameplay boundary (`D27`).

#### Default gameplay roles (design defaults — remap changes **physical→virtual**, not these roles)

| Virtual | Default role | Primary consumer |
| --- | --- | --- |
| `Up`/`Down`/`Left`/`Right` | Move (+ `moveX`/`moveZ`) | `PlayerManager` |
| `Start` | Pause / unpause | `GameLoop.beforeFrame` → pause gate · Pause DOM overlay |
| `A` | Fire | `FiringManager` |
| `B` | Bomb | `FiringManager` |
| `X` | Switch weapon | `FiringManager` |
| `Y` | Switch bomb | `FiringManager` |
| `R1` | Dash | `PlayerManager` |
| `R2` | *Reserved* (secondary fire / alt — unbound until a card assigns it) | — |

#### Scheme adapters (exactly one active)

| Scheme | Adapter | Physical sources | Notes |
| --- | --- | --- | --- |
| **Keyboard** | `KeyboardInputAdapter` | Keys → virtual pad | Default on boot. `preventDefault` on bound gameplay keys. |
| **Mix** | `MixInputAdapter` | Keyboard + **mouse buttons / wheel** + optional **mouse-move hold steer** | Mouse position steers only when **Use mouse to steer** is on (Pause → Controls). Wheel/buttons map to virtual face buttons. |
| **Gamepad** | `GamepadInputAdapter` | W3C standard layout via `navigator.getGamepads()` | Left stick → `moveX`/`moveZ`; face/shoulders → `A`/`B`/`X`/`Y`/`R1`/`R2`; **pause button index** → `Start`. Haptics optional (deferred · docs2 `D18`). |
| **Touch** | `TouchInputAdapter` | **nipplejs** left-zone stick + on-screen buttons | nipplejs lives in `touch-controls/` only; adapter reads injected presses/axes — `InputManager` never imports nipplejs. |

- **One scheme active at a time** (`D27`). Player picks scheme on Pause → **Controls** tab (`D21`).
- **Free Cam** (`CAM-06`): when Pause → Graphics → **Free Cam** is on, physical **IJKL/UO** fly the camera (outside the virtual pad). Ship still uses pad tokens. Keys do nothing when the option is off in PROD.
- **DEV debug camera** without the option stays DEV-only and is stripped in production (`BLD-05`) — do not confuse with product Free Cam.

#### `InputManager` contract (sketch)

```
update(dt)           // poll active adapter only
isDown(token)        // level: Up|Down|Left|Right|Start|A|B|X|Y|R1|R2
wasPressed(token)    // edge (consume optional)
axis(id)             // moveX | moveZ
setScheme(name)      // keyboard | mix | gamepad | touch
scheme               // readonly active scheme
setCaptureDom(bool)  // keyboard/mix DOM capture (off while Pause overlay focused)
dispose()
```

Consumers depend on this port — not on adapter classes.

#### Acceptance (hub-level · `CTRL-01`)

- Boot with **Keyboard** scheme: mouse click does not press `A`.
- Pause → switch to **Mix** / **Gamepad** / **Touch**: same virtual tokens drive the same motion/fire curve after deadzone.
- `PlayerManager` / `FiringManager` source files contain **no** `KeyboardEvent`, `MouseEvent`, `Gamepad`, or `nipplejs` imports.

Port of docs2 `A02`/`C02`/`G12` feel; POC2 class names (`InputState`, `PlayerController`) become `InputManager` / `PlayerManager` (`D22`).

---

## Physical bindings & persistence (`CTRL-02`, `D27`)

tag_g_input tag_s_input_bind_storage tag_s_input_schemes
RESUME: Runtime `InputBindings` maps physical controls → virtual tokens; defaults from `BALANCE.controls`; player remap persisted locally.

#### Data model (`poc3/src/core/input-bindings.ts`)

| Layer | Owner | Contents |
| --- | --- | --- |
| **Defaults** | `BALANCE.controls` | Authored seed tables (`keyboard`, `mix`, `gamepad`, `touch`) — physical → virtual token names |
| **Runtime** | `InputBindings` | Normalized structs: `keyboard.*`, `mouse.*`, `gamepad.*`, `touch` slots |
| **Persist** | `control-settings.ts` (Dexie `storeCache`) | `{ scheme, bindings }` — survives reload on Itch/Demo builds |
| **Live editor** | `InputBindingsManager` | Mutations + revision bump; Pause Controls tab writes through `GameApp` |

Remap **never** rewrites virtual roles (`A` still means fire). It only changes which physical key/button/slot emits which virtual token.

#### Pause physical bindings (locked)

| Scheme | Binding field | Default physical | Virtual emitted | Nullable |
| --- | --- | --- | --- | --- |
| Keyboard / Mix | `keyboard.pause` | `Escape` (`KEYBOARD_PAUSE_DEFAULT`) | `Start` | yes — when `null`, key behaves normally in DOM (no pause) |
| Gamepad | `gamepad.pause` | button index **9** (Start on standard mapping) | `Start` | yes |
| Touch | fixed overlay control | top-right **Pause** button (`touch-controls/`) | `Start` via `touchPauseVirtualToken()` | N/A (fixed control; role is always `Start`) |

**No native shortcuts:** `game-app`, `RunScene`, and Core **must not** hardcode `Escape`, gamepad Start, or touch Pause. Pause toggle is **only** `input.wasPressed('Start')` after adapters map bound physical inputs.

Adapter rules:

- `keyboardTokenFromCode` — if `keyboard.pause === code` → `Start`
- `gamepadTokenFromButton` — if `gamepad.pause === index` → `Start`
- `TouchControls` — pause button calls `TouchInputAdapter.press('Start')`
- When `captureDom` is false (Pause menu open), **only** the bound pause key is still captured (`shouldCaptureKeyboardPress`) so pause can close; other gameplay keys are ignored on DOM UI.

#### Pause gate (`GameLoop.beforeFrame`, C02)

```
input.update(frameDt) // UI clock: even while paused or before a zero-tick frame
if input.wasPressed('Start') → togglePause()   // toggles overlay; all schemes
if loop.paused → return                     // no gameplay sim
buffer.sample(virtual frame); fixed tick consumes buffered commands → RunSimulation
```

While remap listen mode is active (`remap-listen-state`), `onPause` is suppressed so binding capture is not interrupted.

#### Acceptance (`CTRL-02`)

- Rebinding pause away from `Escape` stops `Escape` from toggling pause; the new key emits `Start`.
- Rebinding gamepad pause away from index 9 stops that button from emitting `Start` unless assigned.
- `game-app.ts` contains **no** `keydown` handler for pause keys and **no** sidecar gamepad pause poll.
- Persisted bindings reload on boot (`loadControlSettings`).

---

## Pause Controls tab (`CTRL-03`, `SCENE-05`)

tag_g_input tag_s_input_pause_controls_tab tag_s_scene_pause_overlay
RESUME: DOM Controls panel — scheme picker, pause remap, combat remap, mix mouse options, touch slot assigns; remap listen suspends overlay gamepad nav.

**Render:** DOM overlay (`PauseOverlay` React) — not canvas (`D23` POC3 interim).

#### Layout (Controls tab)

| Section | Schemes | Contents |
| --- | --- | --- |
| **Input Scheme** | all | Tab bar: Keyboard · Keyboard+Mouse · Gamepad · Touch |
| **Pause** | keyboard, mix, gamepad | Remap rows: `keyboard.pause`, `gamepad.pause` (mix shows both) |
| **Movement / Actions** | per scheme | Keyboard keys; mix adds mouse steer toggle + sensitivity + mouse buttons; gamepad face buttons; touch slot `<select>` per combat button |
| **Touch Pause** | touch | Display-only: *Top-right button (fixed)* |
| **Reset** | all | `resetControlBindings()` → `BALANCE` defaults |

#### Remap listen mode

- `ControlRemapButton` sets `remap-listen-state` while listening.
- While active: `pauseMenuNav.pollGamepad()` skipped; pause toggle suppressed.
- Pause key remap: `acceptEscapeAsBinding` — `Escape` assigns rather than cancels listen.
- Gamepad button capture uses dedicated poll (not pause-menu confirm).

#### Pause overlay menu navigation (DOM only · not virtual pad)

Separate from gameplay `Start` — operates on focusable DOM inside `#pause-overlay`:

| Input | Behaviour |
| --- | --- |
| Arrow keys | Move focus between controls |
| **Enter** (1st) | Focus **Exit** button (`#pause-exit`) |
| **Enter** (2nd, Exit focused) | Activate Exit (close pause) |
| Gamepad **X** (index 2) | Focus Exit; second press activates if already focused |
| Gamepad **Y** or **X** (Exit focused) | Activate Exit |

Implemented in `pause-menu-nav.ts`; polled from `game-app` sidecar while pause is open.

#### Acceptance (`CTRL-03`)

- All four schemes selectable; bindings persist per scheme.
- Remapping gamepad **Y** (or any button) succeeds while listen mode is active (no spurious DOM click).
- Touch scheme shows combat slot dropdowns; pause row is fixed top-right.

---

## Touch on-screen overlay (`CTRL-04`)

tag_g_input tag_s_input_nipplejs_touch
RESUME: View-layer touch chrome above HUD; semi-transparent; stick + combat cluster + pause corner.

**Code:** `poc3/src/ui/touch-controls/touch-controls.ts` · styles `.touch-controls*` in `style.css`.

#### Layout (landscape)

```
+--------------------------------------------------+
|                                    [ Pause ]     |  ← top-right (safe-area)
|                                                  |
|                                                  |
| [ stick ]                          [btn][btn]    |  ← bottom-left stick
|                                    [btn][btn]    |  ← bottom-right 2×2 combat grid
+--------------------------------------------------+
```

| Rule | Value |
| --- | --- |
| **Stacking** | `z-index: 40` — above combat HUD (`5`), debugger (`10`), start hint (`20`); below Pause DOM overlay (`50`, overlay hidden during pause) |
| **Transparency** | Buttons use `rgba` backgrounds (~48% alpha); stick zone has subtle circular backdrop |
| **Pointer** | Root `pointer-events: none`; stick zone + buttons `pointer-events: auto` |
| **Visibility** | Shown only when `scheme === 'touch'` and Run active and pause closed |

#### Acceptance (`CTRL-04`)

- Pause and combat buttons remain tappable over HUD text in the same screen region.
- nipplejs is not imported outside `touch-controls/`.

---

## Requirements (`CTRL-`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `CTRL-01` | must | Virtual pad vocabulary; four exclusive scheme adapters; `InputManager` port | Gameplay code reads only virtual tokens; scheme switch on Pause Controls; no hardware imports in `PlayerManager`/`FiringManager` |
| `CTRL-02` | must | Pause only via virtual `Start` from bound physical inputs; persisted `InputBindings`; no hardcoded Esc/Start/touch pause in `game-app` | Rebind pause key/button; unbound physical inputs behave normally; `wasPressed('Start')` is polled at the UI frame boundary outside sim |
| `CTRL-03` | must | Pause Controls tab: scheme picker, pause + combat remap, mix mouse options, remap listen guard, DOM Exit navigation | Remap succeeds for all schemes; listen mode does not toggle pause or steal gamepad buttons; bindings persist |
| `CTRL-04` | must | Touch overlay layout + z-index above HUD + transparent chrome | Buttons tappable over HUD; pause top-right; combat bottom-right; nipplejs isolated |
