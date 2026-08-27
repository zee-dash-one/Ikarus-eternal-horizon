# Ikarus Eternal Horizon — Input — Virtual Pad

tag_g_input tag_s_input_virtual_pad tag_s_input_device_adapters
RESUME: Device-blind virtual pad; four exclusive scheme adapters (Keyboard · Mix · Gamepad · Touch).

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.0

---

## Virtual input pad (`CTRL-01`, `D27`)

tag_g_input tag_s_input_virtual_pad tag_s_input_device_adapters
RESUME: Device-blind controls — sim reads only the virtual pad; physical devices are mapped through exclusive scheme adapters.

Gameplay systems (`PlayerManager`, `FiringManager`, Pause gate, …) read **only** the **virtual pad**. They never import keyboard codes, mouse buttons, `Gamepad` indices, DOM events, or **nipplejs**. Physical hardware is normalized by **adapters** inside `InputManager`.

#### Virtual vocabulary (locked)

| Kind | Tokens | Rule |
| --- | --- | --- |
| **Directions** | `Up` · `Down` · `Left` · `Right` | Digital edge/level. Adapters also publish analog **`moveX`** / **`moveZ`** ∈ [−1, 1] for stick/nipple/WASD merge (PlayerManager reads axes, not raw hardware). |
| **System** | `Start` | Menu / pause confirm |
| **Face / shoulders** | `A` · `B` · `X` · `Y` · `R1` · `R2` | Digital actions only |

No other symbols exist at the gameplay boundary (`D27`).

#### Default gameplay roles (design defaults — remap changes **physical→virtual**, not these roles)

| Virtual | Default role | Primary consumer |
| --- | --- | --- |
| `Up`/`Down`/`Left`/`Right` | Move (+ `moveX`/`moveZ`) | `PlayerManager` |
| `Start` | Pause / unpause | Pause overlay · `GameLoop` gate |
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
| **Mix** | `MixInputAdapter` | Keyboard + **mouse buttons / wheel** | Mouse **position does not steer**. Wheel/buttons map to virtual face buttons per `BALANCE.controls.mix`. |
| **Gamepad** | `GamepadInputAdapter` | W3C standard layout via `navigator.getGamepads()` | Left stick → `moveX`/`moveZ`; face/shoulders → `A`/`B`/`X`/`Y`/`R1`/`R2`/`Start`. Haptics optional (deferred · docs2 `D18`). |
| **Touch** | `TouchInputAdapter` | **nipplejs** left-zone stick + on-screen buttons | nipplejs lives in touch UI only; adapter reads injected `TouchSource` — `InputManager` never imports nipplejs. |

- **One scheme active at a time** (`D27`). Player picks scheme on Pause → **Controls** tab (`D21`).
- **Remap** edits `BALANCE.controls.{keyboard,mix,gamepad,touch}` — tables map **physical → virtual** tokens only.
- **Debug camera** (IJKL/UO) stays a dev-only path outside the virtual pad (does not ship in production builds).

#### `InputManager` contract (sketch)

```
update(dt)           // poll active adapter only
isDown(token)        // level: Up|Down|Left|Right|Start|A|B|X|Y|R1|R2
wasPressed(token)    // edge (consume optional)
axis(id)             // moveX | moveZ
setScheme(name)      // keyboard | mix | gamepad | touch
scheme               // readonly active scheme
dispose()
```

Consumers depend on this port — not on adapter classes.

#### Acceptance (hub-level)

- Boot with **Keyboard** scheme: mouse click does not press `A`.
- Pause → switch to **Mix** / **Gamepad** / **Touch**: same virtual tokens drive the same motion/fire curve after deadzone.
- `PlayerManager` / `FiringManager` source files contain **no** `KeyboardEvent`, `MouseEvent`, `Gamepad`, or `nipplejs` imports.

Port of docs2 `A02`/`C02`/`G12` feel; POC2 class names (`InputState`, `PlayerController`) become `InputManager` / `PlayerManager` (`D22`).

## Requirements (`CTRL-`)



| ID        | Prio | Requirement                                                                 | Acceptance |
| --------- | ---- | --------------------------------------------------------------------------- | ---------- |
| `CTRL-01` | must | Virtual pad vocabulary (this document); four exclusive scheme adapters; `InputManager` port | Gameplay code reads only virtual tokens; scheme switch on Pause Controls; no hardware imports in `PlayerManager`/`FiringManager` |

