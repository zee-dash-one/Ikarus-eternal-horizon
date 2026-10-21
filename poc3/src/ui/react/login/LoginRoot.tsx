import { useEffect, useState, type FormEvent } from 'react'
import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function LoginRoot() {
  const ui = useGameUiSnapshot()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [register, setRegister] = useState(false)

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

  useEffect(() => { if (!ui.loginVisible) { setEmail(''); setPassword('') } }, [ui.loginVisible])

  if (!ui.loginVisible) {
    return ui.loginBusy ? <p role="status">Conectando ao serviço local…</p> : null
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (ui.loginBusy || !ui.authCapabilities.email) return
    if (register && ui.authCapabilities.password) ui.loginHandlers.onRegister?.(email, password)
    else ui.loginHandlers.onSubmit(email, password)
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
          aria-describedby={ui.loginError ? "login-error" : undefined}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {ui.authCapabilities.password && <label className="login__field">
        <span>Senha</span>
        <input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} disabled={ui.loginBusy} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>}
      <button type="submit" className="login__submit" disabled={ui.loginBusy}>
        {ui.loginBusy ? 'Aguarde…' : register ? 'Criar conta e confirmar email' : 'Entrar'}
      </button>
      </>}
      {ui.authCapabilities.password && <button type="button" disabled={ui.loginBusy} onClick={() => { setRegister(!register); setPassword(''); ui.setLoginError(null); ui.setLoginNotice(null) }}>{register ? 'Já tenho uma conta' : 'Criar conta'}</button>}
      {ui.loginNotice && <p role="status">{ui.loginNotice}</p>}
      {ui.authCapabilities.google && <button type="button" id="login-google" className="login__google" disabled={ui.loginBusy} onClick={() => ui.loginHandlers.onGoogle()}>
        Continuar com Google
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
