// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { RunMetaPanels } from './react/meta/RunMetaPanels.tsx'
import { getGameUiController } from './game-ui-store.ts'

let root: Root | null = null
async function mount() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  document.body.innerHTML = '<div id="test-root"></div>'
  const host = document.getElementById('test-root')
  if (!host) throw new Error('Missing host')
  const ui = getGameUiController()
  ui.setLoginVisible(false); ui.setAccountState('Pilot', false, null)
  root = createRoot(host)
  await act(async () => root?.render(createElement(RunMetaPanels)))
  return ui
}
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = null; document.body.innerHTML = ''; vi.unstubAllGlobals() })
describe('RNK-04 — rankings DOM', () => {
  it('shows preparation progress and keeps Cancel usable while Play is busy', async () => {
    const ui = getGameUiController(), onTitle = vi.fn()
    ui.setMetaHandlers({ ...ui.metaHandlers, onTitle })
    ui.setMetaState({ screen: 'title', titleBusy: true, titleError: null, preparation: { step: 'sprint-plan', completed: 5, total: 6 } })
    await mount()
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Planejando primeira sprint')
    expect(document.querySelector('progress')?.value).toBe(5)
    const cancel = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Cancelar preparação')
    expect(cancel?.disabled).toBe(false)
    await act(async () => cancel?.click())
    expect(onTitle).toHaveBeenCalledOnce()
  })
  it('shows four periods, current player and playable Survivor', async () => {
    const ui = getGameUiController()
    ui.setMetaState({ screen: 'rankings', period: 'weekly', boardStatus: 'ready', board: { mode: 'normal', period: 'weekly', startsAt: null, endsAt: null, serverTime: '', totalPlayers: 1, rows: [{ runId: 'r1', position: 1, displayName: 'Pilot', score: 500, kills: 5, durationMs: 1000, endedAtUtc: '', isCurrentUser: true }], personalBest: null } })
    const onPeriod = vi.fn(); ui.setMetaHandlers({ ...ui.metaHandlers, onPeriod })
    await mount()
    expect(document.querySelectorAll('[aria-label="Período dos recordes"] button')).toHaveLength(4)
    expect(document.querySelector('.run-meta__current')?.textContent).toContain('você')
    const survivor = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Survivor'))
    expect(survivor?.disabled).toBe(false)
    const monthly = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Mensal')
    await act(async () => monthly?.click())
    expect(onPeriod).toHaveBeenCalledWith('monthly')
  })
  it('shows loading, empty and recoverable error states', async () => {
    const ui = getGameUiController()
    ui.setMetaState({ screen: 'rankings', boardStatus: 'error', boardError: 'Rede indisponível', board: null })
    const onRetryBoard = vi.fn(); ui.setMetaHandlers({ ...ui.metaHandlers, onRetryBoard })
    await mount()
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Rede indisponível')
    const retry = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Tentar novamente')
    await act(async () => retry?.click())
    expect(onRetryBoard).toHaveBeenCalledOnce()
    await act(async () => ui.setMetaState({ boardStatus: 'loading' }))
    expect(document.querySelector('[role="status"]')?.textContent).toContain('Carregando')
    await act(async () => ui.setMetaState({ boardStatus: 'ready', board: { mode: 'normal', period: 'weekly', startsAt: null, endsAt: null, serverTime: '', totalPlayers: 0, rows: [], personalBest: null } }))
    expect(document.body.textContent).toContain('Nenhum recorde neste período')
  })
})

/** Graph disposal and once-only finalization are covered by run-meta-flow/run-result-manager tests. */
describe('SCENE-04-result — accessible result after DEAD', () => {
  it('focuses the result heading, shows frozen stats and links back to menu/rankings', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    document.body.innerHTML = '<div id="test-root"></div>'
    const host = document.getElementById('test-root')
    if (!host) throw new Error('Missing host')
    const ui = getGameUiController()
    ui.setLoginVisible(false); ui.setAccountState('Pilot', false, null)
    ui.setMetaState({ screen: 'result', resultStatus: 'saved', resultError: null, summary: { runId: 'r', mode: 'normal', seed: 'test', buildVersion: 'test', contentVersion: '1', score: 123, kills: 3, durationMs: 62000, endedAt: '', outcome: 'dead', debugModified: true }, accepted: { runId: 'r', score: 123, endedAtUtc: '', eligible: false } })
    const root = createRoot(host)
    try {
      await act(async () => root.render(createElement(RunMetaPanels)))
      expect(document.getElementById('result-root')).not.toBeNull()
      expect(document.activeElement?.textContent).toBe('Resultado')
      expect(document.body.textContent).toContain('1:02')
      expect(document.body.textContent).toContain('Não participa dos recordes')
      expect([...document.querySelectorAll('button')].map((button) => button.textContent)).toContain('Recordes')
    } finally { await act(async () => root.unmount()); document.body.innerHTML = ''; vi.unstubAllGlobals() }
  })
})
