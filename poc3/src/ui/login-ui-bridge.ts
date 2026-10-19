import type { GameUiHost, LoginHandlers } from './game-ui-types.ts'

export interface LoginUiBridge {
  show(): void
  hide(): void
  setBusy(busy: boolean): void
  setError(message: string | null): void
  onSubmit(handler: (email: string) => void): void
  onGoogle(handler: () => void): void
}

/** AUTH-07 — same-document JS bridge; React LoginRoot is the view. */
export function createLoginUiBridge(ui: GameUiHost): LoginUiBridge {
  const handlers: LoginHandlers = { onSubmit: () => undefined, onGoogle: () => undefined, onRetry: () => undefined }
  return {
    show: () => ui.setLoginVisible(true),
    hide: () => ui.setLoginVisible(false),
    setBusy: (busy) => ui.setLoginBusy(busy),
    setError: (message) => ui.setLoginError(message),
    onSubmit: (handler) => {
      handlers.onSubmit = handler
      ui.setLoginHandlers({ ...handlers })
    },
    onGoogle: (handler) => {
      handlers.onGoogle = handler
      ui.setLoginHandlers({ ...handlers })
    },
  }
}
