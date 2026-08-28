import { useGameUiSnapshot } from '../../GameUiContext.tsx'

export function PauseGraphicsTab() {
  const ui = useGameUiSnapshot()

  return (
    <label>
      <input
        type="checkbox"
        id="pause-free-cam"
        checked={ui.freeCam}
        onChange={(e) => {
          ui.setFreeCam(e.target.checked)
          ui.pauseHandlers.onFreeCamChange(e.target.checked)
        }}
      />
      {' '}Free Cam
    </label>
  )
}
