import type { AuthManager } from '../systems/auth-manager.ts'
import type { AuthSession } from '../platform/auth-types.ts'
import { ApiError } from '../platform/api-client.ts'
import type { ProfileStore } from '../persist/profile-store.ts'
import { loadControlSettings, saveControlSettings, createDefaultControlSettings, type ControlSettings } from '../persist/control-settings.ts'
import type { GameUiHost } from './game-ui-types.ts'

interface SessionFlowDeps {
  readonly auth: AuthManager
  readonly ui: GameUiHost
  readonly createProfileStore: (userId: string) => ProfileStore
  readonly applyControls: (settings: ControlSettings) => void
  readonly onReady: () => void
  readonly onClear: () => void
}

/** Async account gate, outside the game tick. Testable without WebGL or DOM. */
export class SessionFlow {
  private readonly _deps: SessionFlowDeps
  private _busy = false
  private _store: ProfileStore | null = null
  private _pending: ControlSettings | null = null
  private _saving: Promise<void> | null = null
  private _retryLogout = false

  constructor(deps: SessionFlowDeps) { this._deps = deps }
  async boot(): Promise<void> { await this._enter(() => this._deps.auth.resolveBootSession()) }
  async signIn(email: string): Promise<void> { await this._enter(() => this._deps.auth.signInWithEmail(email)) }

  private async _enter(resolveSession: () => Promise<AuthSession | null>): Promise<void> {
    if (this._busy) return
    this._busy = true
    const { ui, auth } = this._deps
    ui.setLoginBusy(true)
    ui.setLoginError(null)
    try {
      const session = await resolveSession()
      if (!session) { this._clear(); return }
      const store = this._deps.createProfileStore(session.userId)
      const controls = await loadControlSettings(store)
      this._store = store
      this._deps.applyControls(controls)
      ui.setAccountState(session.displayName, false, null)
      ui.setLoginVisible(false)
      this._deps.onReady()
    } catch (error) {
      this._clear()
      auth.setSession(null)
      ui.setLoginError(error instanceof Error ? error.message : 'Falha ao entrar. Tente novamente.')
    } finally {
      this._busy = false
      ui.setLoginBusy(false)
    }
  }

  async saveControls(settings: ControlSettings): Promise<void> {
    if (!this._store || this._busy) return
    // Copy before awaiting so edits during a request cannot change its payload.
    this._pending = structuredClone(settings)
    await this.retrySave()
  }
  async retrySave(): Promise<void> {
    if (this._saving) return this._saving
    const store = this._store
    if (!store || !this._pending) return
    this._saving = (async () => {
      try {
        while (this._pending && this._store === store) {
          const next = this._pending
          await saveControlSettings(store, next)
          if (this._pending === next) this._pending = null
        }
        this._deps.ui.setAccountState(this._deps.auth.session?.displayName ?? null, this._busy, null)
      } catch (error) {
        this._retryLogout = false
        if (error instanceof ApiError && (error.status === 401 || error.status === 409)) {
          this._clear()
          this._deps.auth.setSession(null)
          this._deps.ui.setLoginError('Sua sessão mudou ou expirou. As últimas alterações não foram salvas. Entre novamente.')
        } else {
          this._deps.ui.setAccountState(this._deps.auth.session?.displayName ?? null, this._busy, `Preferências não salvas: ${error instanceof Error ? error.message : 'tente novamente'}`)
        }
      }
    })()
    try { await this._saving } finally { this._saving = null }
  }

  async retryAccountAction(): Promise<void> {
    if (this._retryLogout) await this.signOut()
    else await this.retrySave()
  }

  async signOut(): Promise<void> {
    if (this._busy) return
    this._busy = true
    const { ui, auth } = this._deps
    ui.setAccountState(auth.session?.displayName ?? null, true, null)
    try {
      await this.retrySave()
      if (this._pending) throw new Error('Não foi possível salvar as preferências. Tente novamente antes de sair.')
      await auth.signOut()
      this._clear()
    } catch (error) {
      this._retryLogout = true
      ui.setAccountState(auth.session?.displayName ?? null, false, error instanceof Error ? error.message : 'Falha ao sair. Tente novamente.')
    } finally { this._busy = false; ui.setAccountBusy(false) }
  }
  private _clear(): void {
    this._store = null
    this._pending = null
    this._retryLogout = false
    this._deps.onClear()
    this._deps.applyControls(createDefaultControlSettings())
    this._deps.ui.setAccountState(null, false, null)
    this._deps.ui.setLoginVisible(true)
  }
}
