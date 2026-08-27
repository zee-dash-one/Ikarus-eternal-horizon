# Ikarus Eternal Horizon — Login & Auth

tag_g_auth tag_s_auth_manager tag_s_auth_ui_bridge
RESUME: AuthManager + LoginUIBridge — HTML/CSS auth shell; mock password + Google OAuth; one AuthPlatformAdapter per build.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.13

**Related:** [`scenes.spec.MD`](./scenes.spec.MD) (`SCENE-01` flow gate) · [`store.spec.MD`](./store.spec.MD) (same JS Bridge pattern · `D34`) · [`architecture.spec.MD`](./architecture.spec.MD) (`D38` DemoHost OAuth) · [`builds.spec.MD`](./builds.spec.MD) (`D37` PlatformKit) · [`nomenclature.spec.MD`](./nomenclature.spec.MD) (`AuthManager`)

---

## Architecture & UI stack

tag_g_auth tag_s_auth_ui tag_s_auth_ui_bridge
RESUME: Presentation is DOM (HTML/CSS); authority is TypeScript AuthManager via same-document JS Bridge — no WebSocket.

Login is a **dedicated HTML/CSS panel** in the game shell layout (same shell that hosts the WebGL canvas and hub tabs). Forms, typography, and error states are standard DOM/CSS matching the design system — **the same stack as the Store tab** (`D34`).

| Layer | Technology | Role |
| --- | --- | --- |
| **Presentation** | HTML + CSS (+ minimal TS bindings) | Render form fields, validation hints, provider buttons, loading/error CSS states |
| **Bridge** | `LoginUIBridge` (same JS realm) | DOM events → `AuthManager`; result codes → CSS / SFX / scene transition |
| **Authority** | `AuthManager` | Session probe, sign-in attempts, logout — **platform-blind** |
| **Platform** | `AuthPlatformAdapter` (`D41`) | OAuth redirect, cookie/session, mock password — **one concrete class per build** |

**`D23` exception (locked):** **Login** and **Store** are **DOM shell chrome** — not canvas scenes. **Start · Title · Run · Pause** stay on the shared WebGL canvas. **Result** and **Rankings** are also DOM (`D42`). On cold boot the canvas may stay hidden until auth succeeds; then `SceneManager` mounts **Start** (`SCENE-02`).

### Communication lock (`D41`) — JS Bridge, not WebSocket

| Option | Decision |
| --- | --- |
| **Same-document JS Bridge** | **Locked** — UI calls `AuthManager` / `LoginUIBridge` in-process |
| Local WebSocket | **Rejected** — same rationale as Store (`D34`) |
| Full-page HTML route | **Rejected** — Login lives in the game shell `#login-root`, not a separate SPA route |

```text
[HTML #login-root] --submit--> LoginUIBridge.trySignIn(credentials)
                                      │
                                      ▼
                                AuthManager.trySignIn
                                      │
                    AuthPlatformAdapter (OAuth / mock / host SDK)
                                      │
                                      ▼
[HTML #login-root] <--result----- LoginUIBridge.applyResult(code)
                                      │
                                      ▼
                         hide #login-root → SceneManager.mount(Start)
```

UI layers **never** set cookies, parse OAuth tokens, or decide session validity. They only reflect `getSessionState()` and dispatch sign-in / Google actions through the bridge.

---

## Platform adapters (`D41`) — decision lock

tag_g_auth tag_s_auth_platform_adapter tag_s_auth_adapter_demo
RESUME: Same pattern as Store/RNK/ACH — AuthManager talks only to AuthPlatformAdapter; build injects one concrete adapter.

### Why this shape (chosen)

| Option | Verdict |
| --- | --- |
| **A. Interface + one concrete adapter per build** (mirror `D28`/`D30`/`D36`) | **Chosen** — one mental model across meta systems; tree-shake host SDKs |
| B. Auth logic scattered in LoginScene canvas code | **Rejected** — Login is DOM; no canvas scene for auth |
| C. Runtime WebSocket for Login UI | **Rejected** — banned by `D41` |
| D. Inline `fetch` in HTML onclick handlers | **Rejected** — UI goes through bridge only |

**Injection:** build flag `IKARUS_PLATFORM=demo|itch|poki|steam` selects which adapter **module is bundled**. Boot calls `AuthManager.setPlatformAdapter(adapter)` once — **no mid-session swap**. Wired via `PlatformKit` alongside Store/RNK/ACH ([`builds.spec.MD`](./builds.spec.MD) `D37`).

```text
[Build: Demo]  ──► DemoAuthAdapter   ──┐
[Build: Itch]  ──► ItchAuthAdapter   ──┤
[Build: Poki]  ──► PokiAuthAdapter   ──┼─► AuthManager (core)
[Build: Steam] ──► SteamAuthAdapter  ──┘
```

### Port contract (sketch)

```typescript
interface AuthSession {
  readonly provider: 'password' | 'google' | 'steam' | 'guest';
  readonly displayName: string;
  readonly userId?: string;
}

interface AuthPlatformAdapter {
  readonly id: 'demo' | 'local' | 'itch' | 'poki' | 'steam';
  /** Cold boot / return from OAuth tab */
  probeSession(): Promise<AuthSession | null>;
  /** Username/password — mock on web; real only if adapter implements */
  signInWithPassword?(username: string, password: string): Promise<AuthSession>;
  /** Returns URL to open in new tab, or starts inline redirect — adapter decides */
  startGoogleSignIn?(): Promise<{ openUrl: string } | 'INLINE_REDIRECT'>;
  signOut(): Promise<void>;
  dispose(): void;
}
```

`AuthManager` never imports Google client libs, Steamworks, or Poki SDK. `id: 'local'` is for unit tests — **not** production Demo kit.

### Adapter matrix (4 builds)

| Build | Adapter | UI chrome | Auth behaviour | Extra |
| --- | --- | --- | --- | --- |
| **Demo** | `DemoAuthAdapter` | JS Bridge (`D41`) | Real **Google OAuth** via DemoHost (`D38`); password path **mock** (`D19`) | `GET /api/me` + httpOnly cookie |
| **Itch.io** | `ItchAuthAdapter` | JS Bridge | Password mock; Google optional later; guest stub OK v1 | Session in Dexie display cache only (`D39`) |
| **Poki** | `PokiAuthAdapter` | JS Bridge | Host identity when SDK exposes; else mock password | Follow Poki account docs when available |
| **Steam** | `SteamAuthAdapter` | JS Bridge inside **Tauri** | **Steam overlay auth** preferred (`Q30`); Google fallback optional | Session via Tauri FS or Steam ticket |

### Rules (locked)

| # | Rule |
| --- | --- |
| R1 | **One** platform adapter active per boot — never Steam imports in a Poki bundle |
| R2 | **Demo = DemoHost** — `DemoAuthAdapter` uses same-origin `/api/auth/*` + `/api/me` |
| R3 | **Password path** on web builds is **mock** — always succeeds when both fields non-empty (`D19`) |
| R4 | **Google OAuth** opens a **new browser tab** on web — game shell stays on Login until `probeSession()` succeeds |
| R5 | Success always transitions to **Start**, never Title (`D19`) |
| R6 | Valid session on cold boot **skips Login** — hide `#login-root`, mount Start directly (`SCENE-01`) |
| R7 | UI never writes `document.cookie` or stores tokens in `localStorage` — adapter + DemoHost own transport |
| R8 | Logout clears session via adapter → show `#login-root` again (Title/Run must not remain reachable) |

---

## Ownership (`D41`)

tag_g_auth tag_s_auth_manager
RESUME: AuthManager is the sole validator of session state and sign-in outcomes.

| Owns | Does **not** own |
| --- | --- |
| Session probe on boot | DOM layout / CSS authorship beyond structural contract |
| Sign-in attempt orchestration | OAuth HTTP handlers (DemoHost server) |
| Result codes to bridge | Scene preload (`Start` / `AssetManager`) |
| Which adapter is active (boot wire) | Login streak BUD (`LoginStreakManager` in [`store.spec.MD`](./store.spec.MD)) |
| Dispatch SUCCESS / fail cues | Store purchases |

**Trigger:** Login form buttons call `AuthManager.trySignIn` / `startGoogleSignIn` only through `LoginUIBridge`.

---

## Boot flow

tag_g_scene_flow tag_s_scene_login_auth
RESUME: Bootstrap probes session → show or hide Login DOM → on success mount canvas Start.

```text
Bootstrap
   │
   ├─ AuthManager.initialize(adapter)
   ├─ session = await probeSession()
   │
   ├─ session ok ──► hide #login-root ──► SceneManager.mount(Start)
   │
   └─ no session ──► show #login-root (canvas hidden or idle backdrop)
                         │
                         auth ok ──► hide #login-root ──► SceneManager.mount(Start)
```

| Step | Rule |
| --- | --- |
| 1. Probe | `probeSession()` before first paint when possible — avoid Login flash ≤1 frame (`SCENE-01`) |
| 2. Show Login | `#login-root` visible; WebGL canvas may show static splash or stay hidden |
| 3. Sign in | Bridge validates non-empty fields → Manager → adapter |
| 4. Success | Hide Login DOM; **do not** dispose shell; mount **Start** on canvas |
| 5. Google | Button → adapter returns URL → `window.open(url)`; poll / focus listener → re-probe session |

---

## Sign-in paths

tag_g_auth tag_s_auth_ui
RESUME: Mock password + Google new-tab; validation errors stay on Login.

| Control | Behaviour |
| --- | --- |
| **Username** field | Required for password path |
| **Password** field | Masked; required for password path |
| **Sign in** | Mock (`D19`) — **always succeeds** when both non-empty → **Start** |
| **Continue with Google** | Demo: `/api/auth/google/start` URL in **new tab**; shell stays on Login until cookie session valid |
| **Sign out** (hub/settings later) | `AuthManager.signOut()` → show Login again |

| Result code | DOM / CSS | Next scene |
| --- | --- | --- |
| `SUCCESS` | Remove `.login--busy`; optional success flash | Hide Login → **Start** |
| `INVALID_INPUT` | `.login--error` on empty fields | Stay on Login |
| `FAILED` | `.login--error` generic message | Stay on Login |
| `PENDING_OAUTH` | `.login--busy`; disable buttons | Stay until probe succeeds |

SFX stubs: `SND_LOGIN_SUCCESS` · `SND_LOGIN_FAIL` (optional Theme 0b).

---

## Feedback, audio & CSS states

tag_g_audio tag_s_auth_ui
RESUME: Distinct CSS hooks for idle / busy / error — mirror Store card states.

| Case | DOM / CSS | SFX |
| --- | --- | --- |
| Idle | Default form layout | — |
| Busy | `.login--busy` — disable inputs + spinner on primary button | — |
| Validation error | `.login--error` on field group | — |
| Success | Brief `.login--success` flash before hide | `SND_LOGIN_SUCCESS` |
| Fail | Shake on form (reuse `ui_shake_duration` from store BALANCE if shared) | `SND_LOGIN_FAIL` |

---

## HTML / CSS structure (sketch)

tag_s_auth_ui
RESUME: Minimal shell — Game Design owns final visual system; structural contract only.

```html
<section id="login-root" class="login" data-login-panel>
  <header class="login__header">
    <h1 class="login__title">Ikarus: Eternal Horizon</h1>
  </header>
  <form class="login__form" data-login-form novalidate>
    <label class="login__field">
      <span class="login__label">Username</span>
      <input type="text" name="username" autocomplete="username" required />
    </label>
    <label class="login__field">
      <span class="login__label">Password</span>
      <input type="password" name="password" autocomplete="current-password" required />
    </label>
    <p class="login__error" data-login-error hidden></p>
    <button type="submit" class="login__submit" data-action="sign-in">Sign in</button>
  </form>
  <div class="login__providers">
    <button type="button" class="login__google" data-action="google">Continue with Google</button>
  </div>
</section>
```

| CSS hook | Meaning |
| --- | --- |
| `.login--busy` | OAuth in flight / submit pending |
| `.login--error` | Validation or auth failure |
| `.login--success` | Brief success before transition |
| `#login-root[hidden]` | Session valid — panel removed from tab order |

Bridge binds `[data-action="sign-in"]` / form submit → `trySignIn`; `[data-action="google"]` → `startGoogleSignIn`. Never reads password into Manager logs.

**Shell coexistence with Store:** both `#login-root` and `#store-root` live in `ui/shell.html` (or equivalent). Login shows **before** hub; Store shows **after** Title. Never visible together.

---

## `AuthManager` contract (sketch)

tag_s_auth_manager

```
setPlatformAdapter(adapter)   // boot only — D41
initialize()
probeSession() → AuthSession | null
getSessionState() → AuthSession | null
trySignIn({ username, password }) → AuthResultCode
startGoogleSignIn() → void   // bridge opens tab if URL returned
signOut() → void
dispose()
```

Ports: `AuthPlatformAdapter` · `UIEventDispatcherPort` (bridge) · `SceneTransitionPort` (hide Login → mount Start).

---

## `LoginUIBridge` contract (sketch)

tag_s_auth_ui_bridge

```
bind(root: HTMLElement)
syncSessionState(session | null)
applyResult(code: AuthResultCode)
setBusy(busy: boolean)
dispose()
```

---

## Requirements (`AUTH-`)

| ID | Prio | Requirement | Acceptance |
| --- | --- | --- | --- |
| `AUTH-01` | must | Login UI is HTML/CSS shell tab (`D41`) — same bridge pattern as Store (`D34`) | No canvas Login scene; `#login-root` DOM |
| `AUTH-02` | must | `AuthManager` sole sign-in authority | UI never sets cookies or tokens |
| `AUTH-03` | must | Mock password always succeeds when fields non-empty (`D19`) | Sign in → Start |
| `AUTH-04` | must | Google opens new tab; shell stays on Login until session probe ok | Demo: DemoHost OAuth (`D38`/`ARCH-05`) |
| `AUTH-05` | must | Valid session skips Login on cold boot | Start mounts without Login flash (≤1 frame) |
| `AUTH-06` | must | One `AuthPlatformAdapter` per build (`D41`) | Demo=`DemoAuthAdapter`; no cross-SDK imports |
| `AUTH-07` | must | JS Bridge only — no WebSocket | Same as `STR-06` / `D34` |
| `AUTH-08` | should | Busy / error CSS states on form | `.login--busy` / `.login--error` |
| `AUTH-09` | must | Demo auth via httpOnly cookie + `GET /api/me` | Matches `ARCH-05` |
| `AUTH-10` | should | Steam build prefers Steam overlay auth (`Q30`) | Google optional on Steam |

**Flow gate (unchanged id):** `SCENE-01` in [`scenes.spec.MD`](./scenes.spec.MD) — auth → Start; skip when session exists. Detail lives in this file.

---

## BALANCE keys (Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `ui_shake_duration` | Shared with store fail shake (ms) — or reuse `BALANCE.store.ui_shake_duration` |
| `login.oauthPollIntervalMs` | How often to re-probe after Google tab opened (stub) |

---

## Open questions

| # | Question | Default |
| --- | --- | --- |
| Q36 | Canvas visible behind Login (splash) vs fully hidden | **Hidden** until Start — optional static CSS backdrop only |
| Q37 | Itch/Poki guest/anonymous boot | **Require mock sign-in** v1 — no silent guest |
| Q38 | Re-show Login on session expiry mid-session | Force sign-out overlay; block Store/RNK mutate until re-auth |
