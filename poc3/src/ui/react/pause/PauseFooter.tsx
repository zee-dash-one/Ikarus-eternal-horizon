import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function PauseFooter() {
  const ui = useGameUiSnapshot()

  return (
    <footer className="pause-overlay__footer">
      <button
        type="button"
        className="pause-overlay__exit"
        id="pause-exit"
        onClick={() => ui.pauseHandlers.onResume()}
      >
        Exit
      </button>
    </footer>
  )
}
