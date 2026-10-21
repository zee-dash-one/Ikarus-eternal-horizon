export type RunPhase = 'PREPARING' | 'READY' | 'ENTERING' | 'ACTIVE' | 'TRANSITION' | 'FINISHED' | 'CANCELLED'
export interface DisposableRun { dispose(): void }

/** Owns async generation and resources. No preparation work is performed by step(). */
export class RunFlowManager<T extends DisposableRun> {
  private _phase: RunPhase = 'CANCELLED'
  private _generation = 0
  private _abort: AbortController | null = null
  private _context: T | null = null
  get phase(): RunPhase { return this._phase }
  get context(): T | null { return this._context }
  async prepare(factory: (signal: AbortSignal) => Promise<T>): Promise<boolean> {
    this.cancel()
    const generation = this._generation
    const abort = new AbortController()
    this._abort = abort
    this._phase = 'PREPARING'
    try {
      const context = await factory(abort.signal)
      if (generation !== this._generation || abort.signal.aborted) { context.dispose(); return false }
      this._context = context
      this._phase = 'READY'
      return true
    } catch (error) {
      if (generation !== this._generation || abort.signal.aborted) return false
      this.cancel()
      throw error
    }
  }
  enter(): T | null {
    if (this._phase !== 'READY') return null
    this._phase = 'ENTERING'
    return this._context
  }
  completeEntry(): boolean { return this._move('ENTERING', 'ACTIVE') }
  beginTransition(): boolean { return this._move('ACTIVE', 'TRANSITION') }
  completeTransition(): boolean { return this._move('TRANSITION', 'ACTIVE') }
  finish(): boolean {
    if (!['ENTERING', 'ACTIVE', 'TRANSITION'].includes(this._phase)) return false
    this._phase = 'FINISHED'
    this._abort?.abort()
    return true
  }
  release(): void {
    this._abort?.abort()
    this._abort = null
    const context = this._context
    this._context = null
    context?.dispose()
  }
  cancel(): void { this._generation++; this._phase = 'CANCELLED'; this.release() }
  private _move(from: RunPhase, to: RunPhase): boolean {
    if (this._phase !== from) return false
    this._phase = to
    return true
  }
}
