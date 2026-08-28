import { useState } from 'react'
import { TabBar, TabPanel } from '../../shared/TabBar.tsx'
import type { DevSectionTab } from '../../../game-ui-types.ts'
import { DevShipTab } from '../dev/DevShipTab.tsx'
import { DevHudTab } from '../dev/DevHudTab.tsx'

export function PauseDevTab() {
  const [tab, setTab] = useState<DevSectionTab>('ship')

  return (
    <div className="pause-dev">
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
