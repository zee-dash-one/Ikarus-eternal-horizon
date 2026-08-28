import type { PauseMainTab } from '../../game-ui-types.ts'
import { useGameUiSnapshot } from '../GameUiContext.tsx'
import { TabBar } from '../shared/TabBar.tsx'

const MAIN_TABS: ReadonlyArray<{ id: PauseMainTab; label: string }> = [
  { id: 'controls', label: 'Controls' },
  { id: 'audio', label: 'Audio' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'dev', label: 'Dev' },
]

export function PauseHeader() {
  const ui = useGameUiSnapshot()
  const tabs = ui.isDev ? MAIN_TABS : MAIN_TABS.filter((t) => t.id !== 'dev')

  return (
    <>
      <h2>Paused</h2>
      <TabBar
        className="pause-overlay__tabs pause-tab-group"
        tabs={tabs}
        active={ui.pauseTab}
        onSelect={(tab) => ui.setPauseTab(tab)}
      />
    </>
  )
}
