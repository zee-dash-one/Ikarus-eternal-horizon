import { useEffect, useState, type FormEvent } from 'react'
import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function LoginRoot() {
  const ui = useGameUiSnapshot()
  const [email, setEmail] = useState('')

  useEffect(() => {
    const root = document.getElementById('login-root')
    if (!root) {
      return
    }
    if (ui.loginVisible || (ui.loginBusy && !ui.accountName)) {
      root.removeAttribute('hidden')
    } else {
      root.setAttribute('hidden', '')
    }
    root.classList.toggle('login--busy', ui.loginBusy)
    root.classList.toggle('login--error', Boolean(ui.loginError))
  }, [ui.loginVisible, ui.loginBusy, ui.loginError, ui.accountName])

  useEffect(() => { if (!ui.loginVisible) setEmail('') }, [ui.loginVisible])

  if (!ui.loginVisible) {
    return ui.loginBusy ? <p role="status">Conectando ao serviço local…</p> : null
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (ui.loginBusy || !ui.authCapabilities.email) return
    ui.loginHandlers.onSubmit(email)
  }

  return (
    <form id="login-form" className="login__form" onSubmit={onSubmit} aria-busy={ui.loginBusy}>
      <h1 className="login__title">Ikarus</h1>
      {ui.authCapabilities.mock && <p className="login__note">Ambiente de desenvolvimento · conta local de teste</p>}
      {ui.authCapabilities.email && <>
      <label className="login__field">
        <span>Email</span>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          disabled={ui.loginBusy}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button type="submit" className="login__submit" disabled={ui.loginBusy}>
        {ui.loginBusy ? 'Entrando…' : 'Entrar'}
      </button>
      </>}
      {ui.authCapabilities.google && <button type="button" id="login-google" className="login__google" disabled={ui.loginBusy} onClick={() => ui.loginHandlers.onGoogle()}>
        Continue with Google
      </button>}
      {!ui.authCapabilities.email && !ui.authCapabilities.google && <p>Login ainda não configurado neste ambiente.</p>}
      {ui.loginError ? (
        <p id="login-error" className="login__error" role="alert">
          {ui.loginError}
        </p>
      ) : null}
      {ui.loginError && <button type="button" disabled={ui.loginBusy} onClick={() => ui.loginHandlers.onRetry()}>Tentar novamente</button>}
    </form>
  )
}
