import type { PauseMainTab } from '../../game-ui-types.ts'
import { useGameUiSnapshot } from '../GameUiContext.tsx'
import { TabBar } from '../shared/TabBar.tsx'

const MAIN_TABS: ReadonlyArray<{ id: PauseMainTab; label: string }> = [
  { id: 'controls', label: 'Controls' },
  { id: 'audio', label: 'Audio' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'lab', label: 'Laboratório' },
  { id: 'dev', label: 'Dev' },
]

export function PauseHeader() {
  const ui = useGameUiSnapshot()
  const tabs = MAIN_TABS.filter((tab) => (tab.id !== 'dev' || ui.isDev) && (tab.id !== 'lab' || (ui.runLab && !ui.runLab.survivor)))

  return (
    <header className="pause-overlay__header">
      <h2>Paused</h2>
      <TabBar
        className="pause-overlay__tabs pause-tab-group"
        tabs={tabs}
        active={ui.pauseTab}
        onSelect={(tab) => ui.setPauseTab(tab)}
      />
    </header>
  )
}
