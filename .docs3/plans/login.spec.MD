# Ikarus Eternal Horizon — Login & Auth

tag_g_auth tag_s_auth_manager tag_s_auth_ui_bridge tag_s_auth_platform_adapter
RESUME: Email-only mock authentication in DEV, persisted through local DemoHost SQLite; real Google/email providers are production backlog.

**Revision:** 2026-10-02 · **Hub version:** 0.4.0 · **Decision:** D47 revises D19/D38/D41.
**Related:** [architecture.spec.MD](./architecture.spec.MD) · [scenes.spec.MD](./scenes.spec.MD) · [todo-codex.md](../todo-codex.md).

**Implementation status (2026-10-19):** part A delivered; [local run/API guide](../../demo-host/README.md). DEV email sessions and per-user controls use SQLite; real production providers remain deferred.

## Environment contract

| Environment | Visible providers | Authority / persistence |
| --- | --- | --- |
| **DEV (current delivery)** | **Email only**, mock; no password field, Google button or automatic guest | Local DemoHost API → SQLite users/sessions |
| **Production web (future)** | Google or real email sign-in | Real provider verification and server sessions; no DEV mock routes |
| **Other platform builds (future)** | Host-specific providers where supported | PlatformKit adapters; capability-driven UI |

Mock means a syntactically valid email creates/reuses a local test identity; it sends no message and does not prove ownership. Production email authentication method (for example, verified email link versus password) must be specified before implementing it; this revision does not choose one.

A frontend DEV flag is not a server authorization boundary. The host must independently enable the local mock profile. Fake Google callback behavior is removed; Google routes are unavailable in DEV and real OAuth is deferred.

## UI and ownership

Login remains a React/HTML/CSS panel at `#login-root`, before canvas Start. Presentation → same-document bridge → AuthManager → one injected AuthPlatformAdapter → HTTP API. No WebSocket or full-page login route is needed for local DEV.

- Email input (`type="email"`, required), Enter button, short development-mode label, loading/error/retry states.
- Hide unavailable providers by adapter capabilities; do not render a broken Google button in DEV.
- Normalize email with trim/lowercase under this local test-account policy; validate both UI and server. Do not derive the session userId in the browser.
- Disable repeated submit while busy; release busy state on both success and failure. Distinguish service unavailable from expired/no session.
- AuthManager owns client session orchestration; the server validates sessions and account identity. UI never writes cookies or stores tokens.
- Display names are separate from email; leaderboard rows do not expose email addresses.

## Boot and logout

```text
Boot → GET /api/me
         ├─ valid session → load that user's settings → Start → Title
         ├─ 401 → show Email Login
         └─ transport/server failure → recoverable error + retry

Email Login → POST /api/auth/dev-email → session cookie + AuthSession
            → load user settings → Start → Title → Play / Rankings

Logout → POST /api/auth/logout → revoke SQLite session
       → cancel preparation/Run → clear account cache → Login
```

There is no `guestStub` fallback in the standard DEV flow. Unit-test fixtures may inject a session explicitly without changing product boot behavior. Start keeps the existing asset/audio-unlock responsibility; auth success does not auto-start combat.

## API and persistence

| Method / path | Request | Result |
| --- | --- | --- |
| `POST /api/auth/dev-email` | `{ email }` | Create/reuse local user, create expiring opaque session, set cookie, return public AuthSession |
| `GET /api/me` | Session cookie | AuthSession or 401; no session fabrication |
| `POST /api/auth/logout` | Session cookie | Revoke server session and clear cookie; repeat is harmless |

Use local SQLite migrations/repositories from [architecture.spec.MD](./architecture.spec.MD). Session identity and settings survive browser reload and host restart until expiry. Two test emails are separate users. Cookie is HttpOnly + SameSite; Secure on HTTPS and explicitly configured for local DEV HTTP. Vite uses a same-origin API proxy. No tokens in localStorage/Dexie.

Server returns 400 for malformed email, 401 for invalid/expired session, and service errors separately. Production profile does not register the DEV email route. Mutating APIs validate expected origin and session where appropriate. Login mock accepts only the development identity contract; it is not real email verification.

## Proposed port changes

Adapt existing `AuthPlatformAdapter`, `AuthManager`, UI handlers and tests together. These signatures are a target, not the current implementation.

```typescript
interface AuthSession {
  readonly userId: string;
  readonly displayName: string;
  readonly provider: 'mock' | 'email' | 'google' | 'steam';
}
interface AuthCapabilities {
  readonly email: boolean;
  readonly google: boolean;
  readonly mock: boolean;
}
interface AuthPlatformAdapter {
  readonly capabilities: AuthCapabilities;
  probeSession(): Promise<AuthSession | null>;
  signInWithEmail(email: string): Promise<AuthSession>;
  startGoogleSignIn?(): Promise<void>;
  signOut(): Promise<void>;
}
```

DEV adapter uses `/api/auth/dev-email`; it must not construct a client-only mock session. Future production email UI/port may require a challenge/verification state after the authentication method is selected. Google OAuth remains a future server authorization-code flow; no OAuth secrets in the client.

## Requirements (`AUTH-`)

IDs are retained for traceability; historical SDD cards must be updated before coding against this revision.

| ID | Priority | Requirement | Acceptance |
| --- | --- | --- | --- |
| `AUTH-01` | must | DOM Login with email-only DEV form | No password or Google shown in DEV |
| `AUTH-02` | must | AuthManager orchestrates adapter; server validates session | UI cannot set identity/cookie |
| `AUTH-03` | must | DEV email mock through local API and SQLite | Same email reuses user; malformed email fails; no mail sent |
| `AUTH-04` | later production | Real Google provider by capability | Unavailable in DEV; no fake callback in production |
| `AUTH-05` | must | Valid persisted session skips Login | Reload/restart returns to Start; no guest fallback |
| `AUTH-06` | must | One adapter per environment/platform boot | DEV uses local HTTP adapter; no provider SDK leakage |
| `AUTH-07` | must | Same-document UI bridge | UI calls Manager, never SQL or WebSocket |
| `AUTH-08` | must | Busy/error/retry and input validation | Repeated submit gated; network failure recoverable |
| `AUTH-09` | must | SQLite session + cookie + /api/me + revoking logout | Session expires; restart preserves valid rows; logout invalidates |
| `AUTH-10` | later production | Host identity where supported | Implement after current DEV flow; verify platform capabilities |

## Verification and remaining decisions

Test create/reuse email identity, malformed input, expired session, restart persistence, logout/retry, production mock-route rejection, absence of Google in DEV, and account-scoped settings. Use a temporary SQLite file for integration tests.

Open production decisions: real email authentication method, Google credentials/redirect URI and per-host provider support. None blocks local email mock development. Affected auth/scene/ARCH-05 cards were reconciled for D47 on 2026-10-19. Runtime coverage lives in `poc3/src/ui/session-flow.test.ts`, `poc3/src/platform/demo-auth-adapter.test.ts`, `poc3/src/ui/login-ui.test.ts` and `demo-host/src/app.test.ts`. Other historical TODOs do not certify production providers.
