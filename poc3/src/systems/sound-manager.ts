export class SoundManager {
  private readonly _queue: string[] = []
  private _unlocked = false
  private _musicVolume = 0.7
  private _sfxVolume = 0.8
  private _muted = false
  private _muteShipAi = false
  private _showTextLog = false
  private readonly _log: string[] = []

  get musicVolume(): number {
    return this._musicVolume
  }

  get sfxVolume(): number {
    return this._sfxVolume
  }

  get muted(): boolean {
    return this._muted
  }

  get muteShipAi(): boolean {
    return this._muteShipAi
  }

  get showTextLog(): boolean {
    return this._showTextLog
  }

  get log(): readonly string[] {
    return this._log
  }

  unlock(): void {
    this._unlocked = true
    this._drainQueue()
  }

  playCue(cue: string): void {
    if (!this._unlocked) {
      this._queue.push(cue)
      return
    }
    this._log.push(cue)
  }

  setMusicVolume(v: number): void {
    this._musicVolume = v
  }

  setSfxVolume(v: number): void {
    this._sfxVolume = v
  }

  setMuted(m: boolean): void {
    this._muted = m
  }

  setMuteShipAi(m: boolean): void {
    this._muteShipAi = m
  }

  setShowTextLog(s: boolean): void {
    this._showTextLog = s
  }

  private _drainQueue(): void {
    while (this._queue.length > 0) {
      const cue = this._queue.shift()
      if (cue) {
        this._log.push(cue)
      }
    }
  }
}
