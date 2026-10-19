import {
  clampMouseSteerSensitivity,
  createDefaultInputBindings,
  normalizeInputBindings,
  type InputBindings,
} from '../core/input-bindings.ts'
import {
  EMPTY_DEV_LIVE,
  type AccountHandlers,
  type DevLiveSnapshot,
  type GameUiHost,
  type InputScheme,
  type LoginHandlers,
  type PauseHandlers,
  type PauseMainTab,
} from './game-ui-types.ts'
import type { AuthCapabilities } from '../platform/auth-types.ts'

export class GameUiController implements GameUiHost {
  private readonly _listeners = new Set<() => void>()
  private _loginHandlers: LoginHandlers = {
    onSubmit: () => undefined,
    onGoogle: () => undefined,
    onRetry: () => undefined,
  }
  accountHandlers: AccountHandlers = { onSignOut: () => undefined, onRetrySave: () => undefined }
  authCapabilities: AuthCapabilities = { email: false, google: false, mock: false }
  accountName: string | null = null
  accountBusy = false
  accountError: string | null = null
  private _pauseHandlers: PauseHandlers = {
    onResume: () => undefined,
    onSchemeChange: () => undefined,
    onBindingsChange: () => undefined,
    assignKeyboard: () => undefined,
    assignKeyboardPause: () => undefined,
    assignMouseInput: () => undefined,
    setMouseMoveEnabled: () => undefined,
    setMouseMoveSensitivity: () => undefined,
    assignGamepadButton: () => undefined,
    assignGamepadPause: () => undefined,
    assignTouchSlot: () => undefined,
    resetControlBindings: () => undefined,
    onMuteChange: () => undefined,
    onFreeCamChange: () => undefined,
    onBalanceChange: () => undefined,
  }

  loginVisible = false
  loginBusy = false
  loginError: string | null = null
  startHintVisible = false
  pauseOpen = false
  pauseTab: PauseMainTab = 'controls'
  isDev = true
  devLive: DevLiveSnapshot = EMPTY_DEV_LIVE
  scheme: InputScheme = 'keyboard'
  controlBindings: InputBindings = createDefaultInputBindings()
  bindingsRev = 0
  muted = false
  freeCam = false
  balanceRev = 0
  revision = 0

  subscribe(listener: () => void): () => void {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  get loginHandlers(): LoginHandlers {
    return this._loginHandlers
  }

  get pauseHandlers(): PauseHandlers {
    return this._pauseHandlers
  }

  bumpBalance(): void {
    this.balanceRev += 1
    this._notify()
  }

  setLoginVisible(visible: boolean): void {
    this.loginVisible = visible
    this._notify()
  }

  setLoginBusy(busy: boolean): void {
    this.loginBusy = busy
    this._notify()
  }

  setLoginError(error: string | null): void {
    this.loginError = error
    this._notify()
  }

  setLoginHandlers(handlers: LoginHandlers): void {
    this._loginHandlers = handlers
    this._notify()
  }

  setAuthCapabilities(capabilities: AuthCapabilities): void { this.authCapabilities = capabilities; this._notify() }
  setAccountHandlers(handlers: AccountHandlers): void { this.accountHandlers = handlers; this._notify() }
  setAccountState(name: string | null, busy: boolean, error: string | null): void {
    this.accountName = name; this.accountBusy = busy; this.accountError = error; this._notify()
  }
  setAccountBusy(busy: boolean): void { this.accountBusy = busy; this._notify() }

  setStartHintVisible(visible: boolean): void {
    this.startHintVisible = visible
    this._notify()
  }

  setPauseOpen(open: boolean): void {
    this.pauseOpen = open
    this._notify()
  }

  setPauseTab(tab: PauseMainTab): void {
    this.pauseTab = tab
    this._notify()
  }

  setDevLive(snapshot: DevLiveSnapshot): void {
    const prev = this.devLive
    if (
      prev.integrity === snapshot.integrity
      && prev.energy === snapshot.energy
      && prev.shield === snapshot.shield
      && prev.spd === snapshot.spd
      && prev.pose === snapshot.pose
      && prev.dashing === snapshot.dashing
      && prev.shooting === snapshot.shooting
      && prev.bombing === snapshot.bombing
      && prev.energizing === snapshot.energizing
    ) {
      return
    }
    this.devLive = snapshot
    this._notify()
  }

  setIsDev(isDev: boolean): void {
    this.isDev = isDev
    this._notify()
  }

  setPauseHandlers(handlers: PauseHandlers): void {
    this._pauseHandlers = handlers
  }

  setScheme(scheme: InputScheme): void {
    this.scheme = scheme
    this._notify()
  }

  setMouseMoveSensitivity(value: number): void {
    const next = clampMouseSteerSensitivity(value)
    this.controlBindings = {
      ...this.controlBindings,
      mouse: {
        ...this.controlBindings.mouse,
        moveSensitivity: next,
      },
    }
    this.bindingsRev += 1
    this._notify()
  }

  syncControlBindings(bindings: InputBindings): void {
    const normalized = normalizeInputBindings(bindings)
    this.controlBindings = {
      keyboard: { ...normalized.keyboard },
      mouse: { ...normalized.mouse },
      gamepad: {
        ...normalized.gamepad,
        axes: { ...normalized.gamepad.axes },
      },
      touch: { ...normalized.touch },
    }
    this.bindingsRev += 1
    this._notify()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    this._notify()
  }

  setFreeCam(freeCam: boolean): void {
    this.freeCam = freeCam
    this._notify()
  }

  private _notify(): void {
    this.revision += 1
    for (const listener of this._listeners) {
      listener()
    }
  }
}
