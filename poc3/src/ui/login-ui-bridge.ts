import type { GameUiHost } from './game-ui-types.ts'

export interface LoginUiBridge {
  show(): void
  hide(): void
  setBusy(busy: boolean): void
  setError(message: string | null): void
  onSubmit(handler: (username: string, password: string) => void): void
  onGoogle(handler: () => void): void
}

/** AUTH-07 — same-document JS bridge; React LoginRoot is the view. */
export function createLoginUiBridge(ui: GameUiHost): LoginUiBridge {
  return {
    show: () => ui.setLoginVisible(true),
    hide: () => ui.setLoginVisible(false),
    setBusy: (busy) => ui.setLoginBusy(busy),
    setError: (message) => ui.setLoginError(message),
    onSubmit: (handler) => {
      ui.setLoginHandlers({
        onSubmit: handler,
        onGoogle: () => undefined,
      })
    },
    onGoogle: (handler) => {
      ui.setLoginHandlers({
        onSubmit: () => undefined,
        onGoogle: handler,
      })
    },
  }
}
