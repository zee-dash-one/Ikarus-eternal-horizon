import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function PauseFooter() {
  const ui = useGameUiSnapshot()

  return (
    <footer className="pause-overlay__footer">
      <button type="button" id="pause-resume" onClick={() => ui.pauseHandlers.onResume()}>
        Resume
      </button>
    </footer>
  )
}
