/** Generated WebAudio cues: unlocked by Start gesture, drained outside simulation. */
export class SoundManager {
  private readonly _queue: string[] = []
  private _unlocked = false
  private _musicVolume = 0.7
  private _sfxVolume = 0.8
  private _muted = false
  private _muteShipAi = false
  private _showTextLog = false
  private readonly _log: string[] = []
  private _context: AudioContext | null = null
  private _master: GainNode | null = null
  private _music: GainNode | null = null
  private readonly _voices: OscillatorNode[] = []
  get musicVolume(): number { return this._musicVolume }
  get sfxVolume(): number { return this._sfxVolume }
  get muted(): boolean { return this._muted }
  get muteShipAi(): boolean { return this._muteShipAi }
  get showTextLog(): boolean { return this._showTextLog }
  get log(): readonly string[] { return this._log }
  unlock(): void {
    this._unlocked = true
    if (!this._context && typeof AudioContext !== 'undefined') {
      try {
        const context = new AudioContext(), master = context.createGain(), music = context.createGain()
        this._context = context; this._master = master; this._music = music
        master.gain.value = this._muted ? 0 : 1
        music.gain.value = this._musicVolume * 0.012
        master.connect(context.destination); music.connect(master)
        for (const frequency of [55, 82.41]) {
          const voice = context.createOscillator(); voice.type = 'sine'; voice.frequency.value = frequency
          voice.connect(music); voice.start(); this._voices.push(voice)
        }
        void context.resume().catch(() => {})
      } catch { this._context = null }
    }
    this.flush()
  }
  playCue(cue: string): void {
    if (this._queue.length < 32 && !this._queue.includes(cue)) this._queue.push(cue)
  }
  flush(): void {
    if (!this._unlocked) return
    for (let i = 0; i < 4 && this._queue.length; i++) {
      const cue = this._queue.shift()
      if (!cue) continue
      this._log.push(cue); if (this._log.length > 64) this._log.shift()
      const context = this._context, master = this._master
      if (!context || !master || this._muted || (this._muteShipAi && cue.startsWith('ai:'))) continue
      const voice = context.createOscillator(), gain = context.createGain(), now = context.currentTime
      voice.type = 'sine'
      const frequency = cue === 'miniboss' ? 110 : cue === 'collect' ? 880 : cue === 'craft_complete' ? 660 : cue === 'enemy_destroyed' ? 220 : 440
      voice.frequency.setValueAtTime(frequency, now); voice.frequency.exponentialRampToValueAtTime(frequency * 0.65, now + 0.12)
      gain.gain.setValueAtTime(this._sfxVolume * 0.045, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      voice.connect(gain); gain.connect(master); voice.start(now); voice.stop(now + 0.16)
      voice.onended = () => { voice.disconnect(); gain.disconnect() }
    }
  }
  setMusicVolume(v: number): void { this._musicVolume = Math.max(0, Math.min(1, v)); if (this._music) this._music.gain.value = this._musicVolume * 0.012 }
  setSfxVolume(v: number): void { this._sfxVolume = Math.max(0, Math.min(1, v)) }
  setMuted(m: boolean): void { this._muted = m; if (this._master) this._master.gain.value = m ? 0 : 1 }
  setMuteShipAi(m: boolean): void { this._muteShipAi = m }
  setShowTextLog(s: boolean): void { this._showTextLog = s }
  dispose(): void {
    for (const voice of this._voices) { voice.stop(); voice.disconnect() }
    this._voices.length = 0; this._queue.length = 0
    void this._context?.close().catch(() => {})
    this._context = null
  }
}
