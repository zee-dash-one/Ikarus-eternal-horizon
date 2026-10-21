import type {
  BindAction,
  InputBindings,
  MouseBindInput,
  MouseButtonAction,
  TouchSlotId,
} from '../core/input-bindings.ts'
import type { AuthCapabilities } from '../platform/auth-types.ts'
import type { MetaUiHost } from './meta-types.ts'

import type { LabSnapshot } from '../core/run-economy.ts'

export type PauseMainTab = 'controls' | 'audio' | 'graphics' | 'lab' | 'dev'
export type DevSectionTab = 'ship' | 'hud'
export type DevShipTab = 'live' | 'balance'
export type DevHudTab = 'rings'
export type InputScheme = 'keyboard' | 'mix' | 'gamepad' | 'touch'

export type { BindAction, MouseBindInput, MouseButtonAction, TouchSlotId }

export interface DevLiveSnapshot {
  readonly preparation?: string
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
  onSubmit(email: string, password?: string): void
  onRegister?(email: string, password: string): void
  onGoogle(): void
  onRetry(): void
}

export interface AccountHandlers {
  onSignOut(): void
  onRetrySave(): void
}

export interface PauseHandlers {
  onCraft?(id: string): void
  onCancelCraft?(): void
  onSelectWeapon?(id: string): void
  onQuit(): void
  onDevFinish(): void
  onResume(): void
  onSchemeChange(scheme: InputScheme): void
  onBindingsChange(): void
  assignKeyboard(action: BindAction, code: string): void
  assignKeyboardPause(code: string): void
  assignMouseInput(action: MouseButtonAction, input: MouseBindInput): void
  setMouseMoveEnabled(enabled: boolean): void
  setMouseMoveSensitivity(sensitivity: number): void
  assignGamepadButton(action: MouseButtonAction, button: number): void
  assignGamepadPause(button: number): void
  assignTouchSlot(slot: TouchSlotId, action: BindAction): void
  resetControlBindings(): void
  onMuteChange(muted: boolean): void
  onMusicVolume?(value: number): void
  onSfxVolume?(value: number): void
  onFreeCamChange(enabled: boolean): void
  onBalanceChange(): void
}

export interface GameUiHost extends MetaUiHost {
  setRunLab(snapshot: LabSnapshot | null): void
  setAuthCapabilities(capabilities: AuthCapabilities): void
  setAccountState(name: string | null, busy: boolean, error: string | null): void
  setAccountBusy(busy: boolean): void
  setAccountHandlers(handlers: AccountHandlers): void
  setLoginVisible(visible: boolean): void
  setLoginBusy(busy: boolean): void
  setLoginError(error: string | null): void
  setLoginNotice(notice: string | null): void
  setLoginHandlers(handlers: LoginHandlers): void
  setStartHintVisible(visible: boolean): void
  setPauseOpen(open: boolean): void
  setPauseTab(tab: PauseMainTab): void
  setDevLive(snapshot: DevLiveSnapshot): void
  setIsDev(isDev: boolean): void
  setPauseHandlers(handlers: PauseHandlers): void
  setScheme(scheme: InputScheme): void
  setMouseMoveSensitivity(value: number): void
  syncControlBindings(bindings: InputBindings): void
}
