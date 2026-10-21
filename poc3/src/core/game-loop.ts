/** Fixed sim tick — clock constant, not a feel knob (ARCH-17). */
export const SIM_DT = 1 / 60
export const MAX_FRAME_DT = 0.25
export const MAX_STEPS_PER_FRAME = 5

export interface FrameClock {
  now(): number
  request(cb: (timeMs: number) => void): number
  cancel(id: number): void
}

export interface GameLoopOptions {
  readonly step: (dt: number) => void
  readonly sidecar?: () => void
  /** UI/input clock: invoked even while simulation is paused. Delta is bounded. */
  readonly beforeFrame?: (dt: number) => void
  readonly clock?: FrameClock
}

const browserClock: FrameClock = {
  now(): number {
    return performance.now()
  },
  request(cb: (timeMs: number) => void): number {
    return requestAnimationFrame(cb)
  },
  cancel(id: number): void {
    cancelAnimationFrame(id)
  },
}

export class GameLoop {
  private readonly _step: (dt: number) => void
  private readonly _sidecar: (() => void) | undefined
  private readonly _beforeFrame: ((dt: number) => void) | undefined
  private readonly _clock: FrameClock
  private _running = false
  private _paused = false
  private _lastMs = 0
  private _syncAcc = 0
  private _rafId = 0
  private _clockGeneration = 0

  constructor(options: GameLoopOptions) {
    this._step = options.step
    this._sidecar = options.sidecar
    this._beforeFrame = options.beforeFrame
    this._clock = options.clock ?? browserClock
  }

  get running(): boolean {
    return this._running
  }

  get paused(): boolean {
    return this._paused
  }

  start(): void {
    if (this._running) {
      return
    }
    this._running = true
    this.resetClock()
    this._rafId = this._clock.request((t) => this._onFrame(t))
  }

  stop(): void {
    if (!this._running) {
      return
    }
    this._running = false
    this.resetClock()
    this._clock.cancel(this._rafId)
    this._rafId = 0
  }

  pause(): void {
    this._paused = true
    this.resetClock()
  }

  resume(): void {
    this._paused = false
    this.resetClock()
  }

  resetClock(): void {
    this._clockGeneration++
    this._lastMs = this._clock.now()
    this._syncAcc = 0
  }

  /** Advance sim by one fixed tick — for tests without rAF. */
  stepSim(): void {
    if (!this._paused) {
      this._step(SIM_DT)
    }
  }

  private _onFrame(timeMs: number): void {
    if (!this._running) {
      return
    }
    const elapsed = (timeMs - this._lastMs) / 1000
    const rawDt = Number.isFinite(elapsed) ? Math.max(0, Math.min(MAX_FRAME_DT, elapsed)) : 0
    if (Number.isFinite(timeMs)) this._lastMs = timeMs
    const generation = this._clockGeneration
    this._beforeFrame?.(rawDt)
    if (!this._running) return
    if (!this._paused && generation === this._clockGeneration) {
      this._syncAcc += rawDt
      let steps = 0
      while (this._syncAcc + 1e-10 >= SIM_DT && steps < MAX_STEPS_PER_FRAME && !this._paused && this._running && generation === this._clockGeneration) {
        this._syncAcc -= SIM_DT
        this._step(SIM_DT)
        steps++
      }
      // Drop overdue full ticks; retain only the sub-tick fraction, never repay debt.
      if (steps === MAX_STEPS_PER_FRAME) {
        this._syncAcc = Math.max(0, this._syncAcc - Math.floor((this._syncAcc + 1e-10) / SIM_DT) * SIM_DT)
      }
    }
    this._sidecar?.()
    if (this._running) this._rafId = this._clock.request((t) => this._onFrame(t))
  }
}
