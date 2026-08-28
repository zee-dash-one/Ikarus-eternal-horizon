/** Fixed sim tick — clock constant, not a feel knob (ARCH-17). */
export const SIM_DT = 1 / 60

export interface FrameClock {
  now(): number
  request(cb: (timeMs: number) => void): number
  cancel(id: number): void
}

export interface GameLoopOptions {
  readonly step: (dt: number) => void
  readonly sidecar?: () => void
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
  private readonly _clock: FrameClock
  private _running = false
  private _paused = false
  private _lastMs = 0
  private _syncAcc = 0
  private _rafId = 0

  constructor(options: GameLoopOptions) {
    this._step = options.step
    this._sidecar = options.sidecar
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
    this._lastMs = this._clock.now()
    this._rafId = this._clock.request((t) => this._onFrame(t))
  }

  stop(): void {
    if (!this._running) {
      return
    }
    this._running = false
    this._clock.cancel(this._rafId)
    this._rafId = 0
  }

  pause(): void {
    this._paused = true
  }

  resume(): void {
    this._paused = false
    this._lastMs = this._clock.now()
    this._syncAcc = 0
  }

  /** Advance sim by one fixed tick — for tests without rAF. */
  stepSim(dt: number = SIM_DT): void {
    if (!this._paused) {
      this._step(dt)
    }
  }

  private _onFrame(timeMs: number): void {
    if (!this._running) {
      return
    }
    const rawDt = (timeMs - this._lastMs) / 1000
    this._lastMs = timeMs
    if (!this._paused) {
      this._syncAcc += rawDt
      while (this._syncAcc >= SIM_DT) {
        this._step(SIM_DT)
        this._syncAcc -= SIM_DT
      }
    }
    this._sidecar?.()
    this._rafId = this._clock.request((t) => this._onFrame(t))
  }
}
