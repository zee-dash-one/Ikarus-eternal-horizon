import { useGameUiSnapshot } from '../GameUiContext.tsx'
import { PauseHeader } from './PauseHeader.tsx'
import { PauseBody } from './PauseBody.tsx'
import { PauseFooter } from './PauseFooter.tsx'
import { PauseMenuNavigation } from './PauseMenuNavigation.tsx'

export function PauseOverlay() {
  const ui = useGameUiSnapshot()
  if (!ui.pauseOpen) {
    return null
  }

  return (
    <div id="pause-overlay" className="pause-overlay">
      <div className="pause-overlay__panel">
        <PauseHeader />
        <PauseBody />
        <PauseFooter />
      </div>
      <PauseMenuNavigation />
    </div>
  )
}
