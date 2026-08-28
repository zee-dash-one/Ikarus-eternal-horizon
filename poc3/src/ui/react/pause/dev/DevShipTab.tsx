import { useState } from 'react'
import { TabBar, TabPanel } from '../../shared/TabBar.tsx'
import type { DevShipTab as DevShipTabId } from '../../../game-ui-types.ts'
import { DevShipLive } from './ship/DevShipLive.tsx'
import { DevShipBalance } from './ship/DevShipBalance.tsx'

export function DevShipTab() {
  const [tab, setTab] = useState<DevShipTabId>('live')

  return (
    <div className="pause-dev__panel">
      <TabBar
        className="pause-tab-group pause-tab-group--nested"
        tabs={[
          { id: 'live', label: 'Live' },
          { id: 'balance', label: 'Balance' },
        ]}
        active={tab}
        onSelect={setTab}
      />
      <TabPanel visible={tab === 'live'} className="pause-dev__subpanel">
        <DevShipLive />
      </TabPanel>
      <TabPanel visible={tab === 'balance'} className="pause-dev__subpanel">
        <DevShipBalance />
      </TabPanel>
    </div>
  )
}
