import { useGameUiSnapshot } from '../GameUiContext.tsx'
import { PauseLabTab } from './tabs/PauseLabTab.tsx'
import { PauseControlsTab } from './tabs/PauseControlsTab.tsx'
import { PauseAudioTab } from './tabs/PauseAudioTab.tsx'
import { PauseGraphicsTab } from './tabs/PauseGraphicsTab.tsx'
import { PauseDevTab } from './tabs/PauseDevTab.tsx'

export function PauseBody() {
  const ui = useGameUiSnapshot()
  const tab = ui.pauseTab

  return (
    <div className="pause-overlay__body">
      {tab === 'controls' ? (
        <div className="pause-tab">
          <PauseControlsTab />
        </div>
      ) : null}
      {tab === 'audio' ? (
        <div className="pause-tab">
          <PauseAudioTab />
        </div>
      ) : null}
      {tab === 'graphics' ? (
        <div className="pause-tab">
          <PauseGraphicsTab />
        </div>
      ) : null}
      {tab === 'lab' && !ui.runLab?.survivor ? <PauseLabTab /> : null}
      {tab === 'dev' && ui.isDev ? (
        <div className="pause-tab">
          <PauseDevTab />
        </div>
      ) : null}
    </div>
  )
}
