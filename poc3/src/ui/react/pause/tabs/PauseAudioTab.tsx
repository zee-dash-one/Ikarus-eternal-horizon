import { useGameUiSnapshot } from '../../GameUiContext.tsx'
export function PauseAudioTab() {
  const ui = useGameUiSnapshot()
  return <section aria-label="Áudio">
    <label><input type="checkbox" id="pause-mute" checked={ui.muted} onChange={(e) => { ui.setMuted(e.target.checked); ui.pauseHandlers.onMuteChange(e.target.checked) }} /> Silenciar áudio</label>
    <label>Música <input type="range" min="0" max="1" step="0.05" value={ui.musicVolume} onChange={(e) => { const value = Number(e.target.value); ui.setMusicVolume(value); ui.pauseHandlers.onMusicVolume?.(value) }} /></label>
    <label>Efeitos <input type="range" min="0" max="1" step="0.05" value={ui.sfxVolume} onChange={(e) => { const value = Number(e.target.value); ui.setSfxVolume(value); ui.pauseHandlers.onSfxVolume?.(value) }} /></label>
  </section>
}
