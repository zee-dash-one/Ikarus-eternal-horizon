import { useEffect, useRef } from 'react'
import { useGameUiSnapshot } from '../GameUiContext.tsx'
import type { RankingPeriod } from '../../../../../shared/rankings.ts'

const PREPARATION_LABELS = {
  'enemy-points': 'Preparando rotas dos inimigos', 'asteroid-points': 'Preparando campo de asteroides',
  parallax: 'Carregando cenário', sector: 'Carregando setor', 'sprint-plan': 'Planejando primeira sprint', 'first-encounter': 'Finalizando preparação',
}

const PERIODS: ReadonlyArray<{ value: RankingPeriod; label: string }> = [
  { value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensal' },
  { value: 'annual', label: 'Anual' }, { value: 'eternal', label: 'Eterno' },
]
function duration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
function utcDate(value: string): string { return `${new Date(value).toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC` }

export function RunMetaPanels() {
  const ui = useGameUiSnapshot()
  const state = ui.meta
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { if (state.screen !== 'none') title.current?.focus() }, [state.screen])
  if (state.screen === 'none' || ui.loginVisible || !ui.accountName) return null
  const handlers = ui.metaHandlers
  const locked = state.resultStatus === 'sending' || state.resultStatus === 'error'

  return <section id={`${state.screen === 'rankings' ? 'rankings' : state.screen === 'result' ? 'result' : 'title'}-root`} className="run-meta" aria-label={state.screen === 'rankings' ? 'Recordes' : state.screen === 'result' ? 'Resultado' : 'Menu principal'}>
    <div className={`run-meta__panel ${state.screen === 'rankings' ? 'run-meta__panel--wide' : ''}`}>
      {state.screen === 'title' && <>
        <p className="run-meta__eyebrow">ETERNAL HORIZON</p>
        <h1 ref={title} tabIndex={-1}>IKARUS</h1>
        <p>Sobreviva ao próximo horizonte.</p>
        <div className="run-meta__actions">
          <button type="button" className="run-meta__primary" disabled={state.titleBusy} onClick={() => handlers.onPlay()}>{state.titleBusy ? 'Preparando partida…' : 'Jogar'}</button>
          <button type="button" disabled={state.titleBusy} onClick={() => handlers.onRankings()}>Recordes</button>
          {state.titleBusy && <button type="button" onClick={() => handlers.onTitle()}>Cancelar preparação</button>}
        </div>
        <div className="run-meta__tabs" role="group" aria-label="Modo de jogo">
          {(['normal', 'survivor'] as const).map((mode) => <button type="button" key={mode} disabled={state.titleBusy} aria-pressed={state.mode === mode} onClick={() => handlers.onMode?.(mode)}>{mode === 'normal' ? 'Normal' : 'Survivor'}</button>)}
        </div>
        <p className="run-meta__note">{state.mode === 'survivor' ? 'Uma tentativa · apenas Laser · sem bombas, equipamentos ou laboratório.' : 'Colete materiais e construa melhorias no laboratório durante a pausa.'}</p>
        {state.titleBusy && state.preparation && <div role="status">
          <p>{PREPARATION_LABELS[state.preparation.step]}…</p>
          <progress aria-label="Preparação da partida" value={state.preparation.completed} max={state.preparation.total} />
        </div>}
        {state.titleError && <p role="alert">{state.titleError}</p>}
      </>}
      {state.screen === 'result' && state.summary && <>
        <p className="run-meta__eyebrow">FIM DA PARTIDA</p>
        <h1 ref={title} tabIndex={-1}>Resultado</h1>
        <dl className="run-meta__stats">
          <div><dt>Modo</dt><dd>{state.summary.mode === 'survivor' ? 'Survivor' : 'Normal'}</dd></div>
          <div><dt>Pontuação</dt><dd>{state.summary.score.toLocaleString('pt-BR')}</dd></div>
          <div><dt>Inimigos destruídos</dt><dd>{state.summary.kills}</dd></div>
          <div><dt>Tempo em combate</dt><dd>{duration(state.summary.durationMs)}</dd></div>
        </dl>
        {state.summary.debugModified && <p className="run-meta__note">Partida com alterações de desenvolvimento. Não participa dos recordes.</p>}
        {state.resultStatus === 'sending' && <p role="status">Registrando resultado…</p>}
        {state.resultStatus === 'saved' && <p role="status">{state.accepted?.eligible ? 'Resultado registrado nos recordes.' : state.summary.debugModified ? 'Resultado de teste registrado fora dos recordes.' : 'Partida registrada. Sem pontuação para o ranking.'}</p>}
        {state.resultError && <p role="alert">{state.resultError} O resultado será mantido para nova tentativa.</p>}
        <div className="run-meta__actions">
          {state.resultStatus === 'error' && <button type="button" className="run-meta__primary" onClick={() => handlers.onRetrySubmit()}>Tentar registrar novamente</button>}
          <button type="button" disabled={locked} onClick={() => handlers.onPlay()}>Jogar novamente</button>
          <button type="button" disabled={locked} onClick={() => handlers.onTitle()}>Voltar ao menu</button>
          <button type="button" disabled={locked} onClick={() => handlers.onRankings()}>Recordes</button>
          {state.resultStatus === 'error' && handlers.onReauthenticate && <button type="button" onClick={() => handlers.onReauthenticate?.()}>Entrar novamente</button>}
          {state.resultStatus === 'error' && <button type="button" onClick={() => handlers.onDiscardResult()}>Descartar resultado e voltar</button>}
        </div>
      </>}
      {state.screen === 'rankings' && <>
        <p className="run-meta__eyebrow">CADA PARTIDA CONTA</p>
        <h1 ref={title} tabIndex={-1}>Recordes</h1>
        <div className="run-meta__tabs" role="tablist" aria-label="Modo de jogo">
          {(['normal', 'survivor'] as const).map((mode) => <button type="button" role="tab" key={mode} aria-selected={state.mode === mode} onClick={() => handlers.onMode?.(mode)}>{mode === 'normal' ? 'Normal' : 'Survivor'}</button>)}
        </div>
        <div className="run-meta__tabs" role="tablist" aria-label="Período dos recordes">
          {PERIODS.map((period) => <button type="button" key={period.value} role="tab" aria-selected={state.period === period.value} onClick={() => handlers.onPeriod(period.value)}>{period.label}</button>)}
        </div>
        {state.boardStatus === 'loading' && <p role="status">Carregando recordes…</p>}
        {state.boardStatus === 'error' && <div role="alert"><p>{state.boardError}</p><button type="button" onClick={() => handlers.onRetryBoard()}>Tentar novamente</button></div>}
        {state.boardStatus === 'ready' && state.board && <div role="tabpanel" aria-label={PERIODS.find((p) => p.value === state.period)?.label}>
          <p className="run-meta__note">{state.board.startsAt && state.board.endsAt ? `Desde ${utcDate(state.board.startsAt)} · próximo período em ${utcDate(state.board.endsAt)}.` : 'Todos os resultados registrados.'}</p>
          {state.board.rows.length === 0 ? <p>Nenhum recorde neste período. Sua próxima partida pode ser a primeira.</p> : <div className="run-meta__table-scroll"><table>
            <thead><tr><th scope="col">Posição</th><th scope="col">Piloto</th><th scope="col">Pontos</th><th scope="col">Kills</th><th scope="col">Tempo</th></tr></thead>
            <tbody>{state.board.rows.map((row) => <tr key={row.runId} className={row.isCurrentUser ? 'run-meta__current' : ''} aria-label={row.isCurrentUser ? 'Seu melhor resultado' : undefined}>
              <td>{row.position}</td><td>{row.displayName}{row.isCurrentUser ? ' · você' : ''}</td><td>{row.score.toLocaleString('pt-BR')}</td><td>{row.kills}</td><td>{duration(row.durationMs)}</td>
            </tr>)}</tbody>
          </table></div>}
          {state.board.personalBest && <p>Seu melhor: {state.board.personalBest.score.toLocaleString('pt-BR')} pontos · posição {state.board.personalBest.position} de {state.board.totalPlayers}.</p>}
        </div>}
        <div className="run-meta__actions"><button type="button" onClick={() => handlers.onCloseRankings()}>Voltar</button></div>
      </>}
    </div>
  </section>
}
