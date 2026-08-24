/**
 * §7 Audio — SoundManager. Named SFX cues until Howler lands post-G1.
 * Behaviours call SoundPort (playOverheatCue) so the backend can swap later.
 */

import { BALANCE } from '../core/balancer'

export type SfxCueId = 'laser-overheat'

export interface SoundPort {
  play(id: SfxCueId): void
  playOverheatCue(): void
}

export interface AudioMixerConfig {
  readonly masterVolume: number
  readonly sfxVolume: number
  readonly musicVolume: number
  readonly muted: boolean
}

export interface SoundManagerOptions {
  readonly config?: AudioMixerConfig
}

export class SoundManager implements SoundPort {
  readonly masterVolume: number
  readonly sfxVolume: number
  readonly musicVolume: number

  private _muted: boolean
  private _lastCue: SfxCueId | null = null
  private _disposed = false

  constructor(options: SoundManagerOptions = {}) {
    const config = options.config ?? BALANCE.audio
    this.masterVolume = config.masterVolume
    this.sfxVolume = config.sfxVolume
    this.musicVolume = config.musicVolume
    this._muted = config.muted
  }

  get muted(): boolean {
    return this._muted
  }

  get lastCue(): SfxCueId | null {
    return this._lastCue
  }

  setMuted(muted: boolean): void {
    this._muted = muted
  }

  play(id: SfxCueId): void {
    if (this._disposed) {
      return
    }
    this._lastCue = id
    if (this._muted) {
      return
    }
    this.emit(id)
  }

  playOverheatCue(): void {
    this.play('laser-overheat')
  }

  update(dt: number): void {
    void dt
  }

  dispose(): void {
    this._disposed = true
    this._lastCue = null
  }

  /** Howler hook — silent until the §7 Audio backend lands. */
  private emit(id: SfxCueId): void {
    void id
  }
}
