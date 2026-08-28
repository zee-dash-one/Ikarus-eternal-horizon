import { useGameUiSnapshot } from '../../GameUiContext.tsx'

export function PauseAudioTab() {
  const ui = useGameUiSnapshot()

  return (
    <label>
      <input
        type="checkbox"
        id="pause-mute"
        checked={ui.muted}
        onChange={(e) => {
          ui.setMuted(e.target.checked)
          ui.pauseHandlers.onMuteChange(e.target.checked)
        }}
      />
      {' '}Mute
    </label>
  )
}
