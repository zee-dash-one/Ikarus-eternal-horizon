import { useState } from 'react'
import { TabBar, TabPanel } from '../../shared/TabBar.tsx'
import type { DevSectionTab } from '../../../game-ui-types.ts'
import { DevShipTab } from '../dev/DevShipTab.tsx'
import { DevHudTab } from '../dev/DevHudTab.tsx'
import { useGameUiSnapshot } from '../../GameUiContext.tsx'

export function PauseDevTab() {
  const ui = useGameUiSnapshot()
  const [tab, setTab] = useState<DevSectionTab>('ship')

  return (
    <div className="pause-dev">
      {ui.isDev && <div><button type="button" onClick={() => ui.pauseHandlers.onDevFinish()}>Testar fim de partida</button><p>Encerra como teste de desenvolvimento, fora dos recordes.</p></div>}
      <TabBar
        tabs={[
          { id: 'ship', label: 'Ship' },
          { id: 'hud', label: 'HUD' },
        ]}
        active={tab}
        onSelect={setTab}
      />
      <TabPanel visible={tab === 'ship'} className="pause-dev__panel-wrap">
        <DevShipTab />
      </TabPanel>
      <TabPanel visible={tab === 'hud'} className="pause-dev__panel-wrap">
        <DevHudTab />
      </TabPanel>
    </div>
  )
}
