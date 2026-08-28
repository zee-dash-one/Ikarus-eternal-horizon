export interface LoginUiState {
  readonly busy: boolean
  readonly error: string | null
}

export interface LoginUiBridge {
  show(): void
  hide(): void
  setBusy(busy: boolean): void
  setError(message: string | null): void
  onSubmit(handler: (username: string, password: string) => void): void
  onGoogle(handler: () => void): void
}

export function createLoginUiBridge(root: HTMLElement): LoginUiBridge {
  const form = root.querySelector<HTMLFormElement>('#login-form')
  const usernameInput = root.querySelector<HTMLInputElement>('#login-username')
  const passwordInput = root.querySelector<HTMLInputElement>('#login-password')
  const googleBtn = root.querySelector<HTMLButtonElement>('#login-google')
  const errorEl = root.querySelector<HTMLElement>('#login-error')

  let submitHandler: ((username: string, password: string) => void) | null = null
  let googleHandler: (() => void) | null = null

  form?.addEventListener('submit', (e) => {
    e.preventDefault()
    submitHandler?.(usernameInput?.value ?? '', passwordInput?.value ?? '')
  })

  googleBtn?.addEventListener('click', () => {
    googleHandler?.()
  })

  return {
    show(): void {
      root.hidden = false
    },
    hide(): void {
      root.hidden = true
    },
    setBusy(busy: boolean): void {
      root.classList.toggle('login--busy', busy)
    },
    setError(message: string | null): void {
      root.classList.toggle('login--error', Boolean(message))
      if (errorEl) {
        if (message) {
          errorEl.textContent = message
          errorEl.hidden = false
        } else {
          errorEl.textContent = ''
          errorEl.hidden = true
        }
      }
    },
    onSubmit(handler): void {
      submitHandler = handler
    },
    onGoogle(handler): void {
      googleHandler = handler
    },
  }
}
