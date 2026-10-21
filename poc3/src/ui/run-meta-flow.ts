import type { GameMode, RunSubmission, RunSummary, RunTicket, RankingPeriod } from '../../../shared/rankings.ts'
import { RunResultManager } from '../systems/run-result-manager.ts'
import { RunContext } from '../systems/run-context.ts'
import { RunFlowManager } from '../systems/run-flow-manager.ts'
import type { RankingManager } from '../systems/ranking-manager.ts'
import type { ResultOutbox } from '../persist/result-outbox.ts'
import { createMetaState, type MetaUiHost } from './meta-types.ts'

interface MetaFlowDeps {
  readonly ui: MetaUiHost
  readonly rankings: RankingManager
  readonly onTitle: () => void
  readonly onPlay: (run: RunContext) => void
  readonly prepareRun?: (results: RunResultManager, signal: AbortSignal) => Promise<RunContext>
  readonly onDisposeRun: () => void
  readonly hasModifiedBalance: () => boolean
}

/** UI/network orchestration stays outside fixed simulation; retries reuse a frozen payload. */
export class RunMetaFlow {
  readonly lifecycle = new RunFlowManager<RunContext>()
  private readonly _deps: MetaFlowDeps
  private _outbox: ResultOutbox | null = null
  private _pendingDurable = false
  bindOutbox(outbox: ResultOutbox): void { this._outbox?.close?.(); this._outbox = outbox }
  async restorePending(): Promise<boolean> {
    const epoch = this._epoch, pending = await this._outbox?.load()
    if (!pending || epoch !== this._epoch) return false
    const { token: _token, ...summary } = pending
    void _token
    this._pending = Object.freeze(pending); this._pendingDurable = true; this._mode = pending.mode; this._resultMode = pending.mode
    this._deps.rankings.setMode(pending.mode)
    this._screen = 'result'
    this._deps.ui.setMetaState({ ...createMetaState(), mode: pending.mode, screen: 'result', summary: Object.freeze(summary), resultStatus: 'error', resultError: 'Resultado recuperado deste navegador. Tente registrar novamente.' })
    return true
  }
  get canReauthenticate(): boolean { return this._pendingDurable && !this._sending }
  private _epoch = 0
  private _boardRequest = 0
  private _starting = false
  private _sending: Promise<void> | null = null
  private _ticket: RunTicket | null = null
  private _active: RunResultManager | null = null
  private _pending: RunSubmission | null = null
  private _resultMode: GameMode = 'normal'
  private _returnTo: 'title' | 'result' = 'title'
  private _screen: 'none' | 'title' | 'result' | 'rankings' = 'none'
  private _mode: GameMode = 'normal'
  private _period: RankingPeriod = 'weekly'

  constructor(deps: MetaFlowDeps) { this._deps = deps }
  get canLeaveResult(): boolean { return !this._pending && !this._sending }
  clear(): void {
    this._epoch++
    this._outbox?.close?.(); this._outbox = null; this._pendingDurable = false; this._mode = 'normal'
    this._boardRequest++
    this._active?.cancel()
    this.lifecycle.cancel()
    this._active = null
    this._ticket = null
    this._pending = null
    this._sending = null
    this._starting = false
    this._screen = 'none'
    this._period = 'weekly'
    this._deps.rankings.reset(null)
    this._deps.ui.setMetaState(createMetaState())
  }
  showTitle(): void {
    if (!this.canLeaveResult) return
    this._starting = false
    this._epoch++
    const epoch = this._epoch
    this._active?.cancel()
    this._active = null
    this._ticket = null
    this._deps.onDisposeRun()
    this.lifecycle.cancel()
    this._screen = 'title'
    this._deps.ui.setMetaState({ ...createMetaState(), screen: 'title', mode: this._mode })
    this._deps.onTitle()
    void this._deps.rankings.refreshBests().catch(() => {
      if (epoch === this._epoch && this._screen === 'title') this._deps.ui.setMetaState({ titleError: 'Não foi possível atualizar o melhor resultado. Abra Recordes para tentar novamente.' })
    })
  }
  async play(): Promise<void> {
    if (this._starting || !this.canLeaveResult || (this._screen !== 'title' && this._screen !== 'result')) return
    this._starting = true
    const epoch = ++this._epoch
    this._boardRequest++
    this._deps.ui.setMetaState({ titleBusy: true, titleError: null, preparation: null })
    try {
      await this.lifecycle.prepare(async (signal) => {
        const ticket = await this._deps.rankings.startRun(this._mode)
        if (signal.aborted || epoch !== this._epoch) throw new Error('cancelled')
        this._ticket = ticket
        const results = new RunResultManager(ticket)
        if (this._deps.hasModifiedBalance()) results.markDebugModified()
        this._active = results
        return this._deps.prepareRun ? this._deps.prepareRun(results, signal) : new RunContext(results)
      })
    } catch (error) {
      if (epoch === this._epoch) {
        this._active?.cancel()
        this._active = null
        this._ticket = null
        this._deps.ui.setMetaState({ preparation: null, titleError: error instanceof Error ? error.message : 'Não foi possível iniciar a partida.' })
      }
    } finally {
      if (epoch === this._epoch && this.lifecycle.phase !== 'READY') { this._starting = false; this._deps.ui.setMetaState({ titleBusy: false }) }
    }
  }
  /** Adopt only from the frame boundary, never from a delayed promise or a sim tick. */
  mountReady(): void {
    const phase = this.lifecycle.context?.waves?.phase
    if (this.lifecycle.phase === 'ENTERING' && phase === 'ACTIVE') this.lifecycle.completeEntry()
    if (this.lifecycle.phase === 'ACTIVE' && phase === 'TRANSITION') this.lifecycle.beginTransition()
    if (this.lifecycle.phase === 'TRANSITION' && phase === 'ACTIVE') this.lifecycle.completeTransition()
    const context = this.lifecycle.enter()
    if (!context) return
    try {
      this._deps.onPlay(context)
      this._screen = 'none'
      this._deps.ui.setMetaState({ ...createMetaState(), screen: 'none', mode: this._mode })
      // Headless/UI fixtures may omit the world. Prepared runs wait for the logical entry event.
      if (!context.waves) this.lifecycle.completeEntry()
    } catch (error) {
      this._deps.onDisposeRun()
      this.lifecycle.cancel()
      this._active = null
      this._ticket = null
      this._deps.ui.setMetaState({ titleBusy: false, titleError: error instanceof Error ? error.message : 'Não foi possível carregar a partida.' })
      this._deps.onTitle()
    } finally { this._starting = false }
  }
  selectMode(mode: GameMode): void {
    if (this._starting || !this.canLeaveResult || this._screen === 'none') return
    this._mode = mode; this._deps.rankings.setMode(mode)
    this._deps.ui.setMetaState({ mode })
    if (this._screen === 'rankings') void this.loadBoard(this._period)
    else void this._deps.rankings.refreshBests().catch(() => {})
  }
  markDebugModified(): void { this._active?.markDebugModified() }
  finish(summary: RunSummary): void {
    if (!this._ticket || this._ticket.runId !== summary.runId || !this._active || this._active.summary !== summary || this._pending) return
    if (!this.lifecycle.finish()) return
    this._resultMode = summary.mode
    this._pending = Object.freeze({ ...summary, token: this._ticket.token })
    this._active = null
    this._deps.onDisposeRun()
    this.lifecycle.release()
    this._screen = 'result'
    this._deps.ui.setMetaState({ screen: 'result', summary, resultStatus: 'sending', resultError: null, accepted: null })
    void this.retrySubmit()
  }
  async retrySubmit(): Promise<void> {
    if (this._sending) return this._sending
    const pending = this._pending
    if (!pending) return
    const epoch = this._epoch
    this._deps.ui.setMetaState({ resultStatus: 'sending', resultError: null })
    this._sending = (async () => {
      try {
        const outbox = this._outbox
        if (outbox) { await outbox.put(pending); this._pendingDurable = true }
        const accepted = await this._deps.rankings.submitRun(pending)
        await outbox?.remove(pending.runId)
        if (epoch !== this._epoch) return
        this._pending = null
        this._pendingDurable = false
        this._ticket = null
        this._deps.ui.setMetaState({ resultStatus: 'saved', resultError: null, accepted })
      } catch (error) {
        if (epoch === this._epoch) this._deps.ui.setMetaState({ resultStatus: 'error', resultError: error instanceof Error ? error.message : 'Não foi possível registrar. Tente novamente.' })
      }
    })()
    try { await this._sending } finally { if (epoch === this._epoch) this._sending = null }
  }
  discardResult(): void {
    if (this._sending) return
    const finishDiscard = () => { this._pending = null; this._pendingDurable = false; this._ticket = null; this.showTitle() }
    if (this._outbox && this._pending) {
      void this._outbox.remove(this._pending.runId).then(finishDiscard).catch(() => {
        this._deps.ui.setMetaState({ resultStatus: 'error', resultError: 'Não foi possível remover o resultado pendente. Ele foi preservado.' })
      })
    } else finishDiscard()
  }
  async openRankings(): Promise<void> {
    if (!this.canLeaveResult || this._starting || this._screen === 'none') return
    if (this._screen !== 'rankings') this._returnTo = this._screen === 'result' ? 'result' : 'title'
    this._screen = 'rankings'
    await this.loadBoard(this._period)
  }
  async loadBoard(period: RankingPeriod): Promise<void> {
    if (this._screen !== 'rankings') return
    this._period = period
    const request = ++this._boardRequest
    const epoch = this._epoch
    this._deps.ui.setMetaState({ screen: 'rankings', period, boardStatus: 'loading', boardError: null, board: null })
    try {
      const board = await this._deps.rankings.getBoard(this._mode, period)
      if (epoch === this._epoch && request === this._boardRequest && this._screen === 'rankings') this._deps.ui.setMetaState({ board, boardStatus: 'ready' })
    } catch (error) {
      if (epoch === this._epoch && request === this._boardRequest && this._screen === 'rankings') this._deps.ui.setMetaState({ boardStatus: 'error', boardError: error instanceof Error ? error.message : 'Não foi possível carregar os recordes.' })
    }
  }
  closeRankings(): void {
    if (this._screen !== 'rankings') return
    this._boardRequest++
    if (this._returnTo === 'result') {
      this._screen = 'result'
      this._mode = this._resultMode; this._deps.rankings.setMode(this._mode)
      this._deps.ui.setMetaState({ screen: 'result', mode: this._mode })
      void this._deps.rankings.refreshBests().catch(() => {})
    } else this.showTitle()
  }
}
