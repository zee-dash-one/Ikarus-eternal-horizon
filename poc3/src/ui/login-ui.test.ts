// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LoginRoot } from './react/login/LoginRoot.tsx'
import { AccountPanel } from './react/login/AccountPanel.tsx'
import { getGameUiController } from './game-ui-store.ts'

let root: Root | null = null
afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  root = null
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('Email login UI', () => {
  it('renders only email in DEV, exposes Retry and disables native submit when busy', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    document.body.innerHTML = '<div id="login-root" hidden></div>'
    const host = document.getElementById('login-root')
    if (!host) throw new Error('Missing test host')
    const ui = getGameUiController()
    ui.setAuthCapabilities({ email: true, google: false, mock: true })
    ui.setLoginVisible(true)
    ui.setLoginBusy(false)
    ui.setLoginError(null)
    const onRetry = vi.fn()
    ui.setLoginHandlers({ onSubmit: vi.fn(), onGoogle: vi.fn(), onRetry })
    root = createRoot(host)
    await act(async () => root?.render(createElement(LoginRoot)))
    expect(host.hidden).toBe(false)
    expect(host.querySelector<HTMLInputElement>('input')?.type).toBe('email')
    expect(host.querySelector('input[type="password"]')).toBeNull()
    expect(host.querySelector('#login-google')).toBeNull()
    await act(async () => { ui.setLoginBusy(true) })
    expect(host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true)
    await act(async () => { ui.setLoginBusy(false); ui.setLoginError('Serviço indisponível') })
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('indisponível')
    await act(async () => { host.querySelector<HTMLButtonElement>('button[type="button"]')?.click() })
    expect(onRetry).toHaveBeenCalledOnce()
  })
  it('shows account/logout separately from the hidden Login root', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    document.body.innerHTML = '<div id="account-root"></div>'
    const ui = getGameUiController()
    ui.setLoginVisible(false)
    ui.setAccountState('Pilot', false, null)
    const onSignOut = vi.fn()
    ui.setAccountHandlers({ onSignOut, onRetrySave: vi.fn() })
    const host = document.getElementById('account-root')
    if (!host) throw new Error('Missing test host')
    root = createRoot(host)
    await act(async () => root?.render(createElement(AccountPanel)))
    await act(async () => { document.querySelector<HTMLButtonElement>('.account-panel button')?.click() })
    expect(onSignOut).toHaveBeenCalledOnce()
  })
})
