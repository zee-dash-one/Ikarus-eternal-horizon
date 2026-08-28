export type PauseMainTab = 'controls' | 'audio' | 'graphics' | 'dev'
export type DevSectionTab = 'ship' | 'hud'
export type DevShipTab = 'live' | 'balance'
export type DevHudTab = 'rings'
export type InputScheme = 'keyboard' | 'mix' | 'gamepad' | 'touch'

export interface DevLiveSnapshot {
  readonly integrity: string
  readonly energy: string
  readonly shield: string
  readonly spd: string
  readonly pose: string
  readonly dashing: string
  readonly shooting: string
  readonly bombing: string
  readonly energizing: string
}

export const EMPTY_DEV_LIVE: DevLiveSnapshot = {
  integrity: '—',
  energy: '—',
  shield: '—',
  spd: '—',
  pose: '—',
  dashing: '—',
  shooting: '—',
  bombing: '—',
  energizing: '—',
}

export interface LoginHandlers {
  onSubmit(username: string, password: string): void
  onGoogle(): void
}

export interface PauseHandlers {
  onResume(): void
  onSchemeChange(scheme: InputScheme): void
  onMuteChange(muted: boolean): void
  onFreeCamChange(enabled: boolean): void
  onBalanceChange(): void
}

export interface GameUiHost {
  setLoginVisible(visible: boolean): void
  setLoginBusy(busy: boolean): void
  setLoginError(error: string | null): void
  setLoginHandlers(handlers: LoginHandlers): void
  setStartHintVisible(visible: boolean): void
  setPauseOpen(open: boolean): void
  setPauseTab(tab: PauseMainTab): void
  setDevLive(snapshot: DevLiveSnapshot): void
  setIsDev(isDev: boolean): void
  setPauseHandlers(handlers: PauseHandlers): void
  setScheme(scheme: InputScheme): void
}
