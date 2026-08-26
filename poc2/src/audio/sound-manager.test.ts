/**
 * §7 Audio — SoundManager acceptance cases from sound-manager.spec.ts §7.
 */

import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../core/balancer'
import { SoundManager } from './sound-manager'
import soundSource from './sound-manager.ts?raw'

describe('SoundManager', () => {
  it('playOverheatCue records lastCue laser-overheat', () => {
    const sound = new SoundManager()
    sound.playOverheatCue()
    expect(sound.lastCue).toBe('laser-overheat')
    sound.dispose()
  })

  it('playExplosionCue records lastCue explosion', () => {
    const sound = new SoundManager()
    sound.playExplosionCue()
    expect(sound.lastCue).toBe('explosion')
    sound.dispose()
  })

  it('play(id) records lastCue even when muted', () => {
    const sound = new SoundManager({
      config: { masterVolume: 1, sfxVolume: 1, musicVolume: 0.65, muted: true },
    })
    sound.play('laser-overheat')
    expect(sound.lastCue).toBe('laser-overheat')
    expect(sound.muted).toBe(true)
    sound.dispose()
  })

  it('muted skips emit but still records lastCue', () => {
    const sound = new SoundManager()
    sound.setMuted(true)
    sound.playOverheatCue()
    expect(sound.muted).toBe(true)
    expect(sound.lastCue).toBe('laser-overheat')
    sound.dispose()
  })

  it('disposed play is ignored and lastCue stays null', () => {
    const sound = new SoundManager()
    sound.dispose()
    sound.playOverheatCue()
    expect(sound.lastCue).toBeNull()
  })

  it('defaults volumes and mute from BALANCE.audio', () => {
    const sound = new SoundManager()
    expect(sound.masterVolume).toBe(BALANCE.audio.masterVolume)
    expect(sound.sfxVolume).toBe(BALANCE.audio.sfxVolume)
    expect(sound.musicVolume).toBe(BALANCE.audio.musicVolume)
    expect(sound.muted).toBe(BALANCE.audio.muted)
    sound.dispose()
  })

  it('constructor config overrides BALANCE.audio', () => {
    const sound = new SoundManager({
      config: { masterVolume: 0.5, sfxVolume: 0.25, musicVolume: 0.1, muted: true },
    })
    expect(sound.masterVolume).toBe(0.5)
    expect(sound.sfxVolume).toBe(0.25)
    expect(sound.musicVolume).toBe(0.1)
    expect(sound.muted).toBe(true)
    sound.dispose()
  })

  it('play and update allocate no objects', () => {
    const sound = new SoundManager()
    const setSpy = vi.spyOn(globalThis, 'Set')
    sound.playOverheatCue()
    sound.update(0.016)
    expect(setSpy).not.toHaveBeenCalled()
    setSpy.mockRestore()
    sound.dispose()
  })

  it('module does not import three or howler', () => {
    expect(soundSource).not.toMatch(/\bfrom ['"]three['"]/)
    expect(soundSource).not.toMatch(/\bfrom ['"]howler['"]/)
    expect(soundSource).not.toMatch(/\bimport\s+['"]three['"]/)
    expect(soundSource).not.toMatch(/\bimport\s+['"]howler['"]/)
  })
})
