import { useEffect, useState, type FormEvent } from 'react'
import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function LoginRoot() {
  const ui = useGameUiSnapshot()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const root = document.getElementById('login-root')
    if (!root) {
      return
    }
    if (ui.loginVisible) {
      root.removeAttribute('hidden')
    } else {
      root.setAttribute('hidden', '')
    }
    root.classList.toggle('login--busy', ui.loginBusy)
    root.classList.toggle('login--error', Boolean(ui.loginError))
  }, [ui.loginVisible, ui.loginBusy, ui.loginError])

  if (!ui.loginVisible) {
    return null
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    ui.loginHandlers.onSubmit(username, password)
  }

  return (
    <form id="login-form" className="login__form" onSubmit={onSubmit}>
      <h1 className="login__title">Ikarus</h1>
      <label className="login__field">
        <span>Username</span>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="login__field">
        <span>Password</span>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" className="login__submit">
        Sign in
      </button>
      <button type="button" id="login-google" className="login__google" onClick={() => ui.loginHandlers.onGoogle()}>
        Continue with Google
      </button>
      {ui.loginError ? (
        <p id="login-error" className="login__error">
          {ui.loginError}
        </p>
      ) : null}
    </form>
  )
}
