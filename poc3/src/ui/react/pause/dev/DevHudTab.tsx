import { DevHudRings } from './hud/DevHudRings.tsx'

export function DevHudTab() {
  return (
    <div className="pause-dev__panel">
      <nav className="pause-tab-group pause-tab-group--nested" role="tablist">
        <button type="button" className="pause-tab-btn pause-tab-btn--active" role="tab" aria-selected>
          Rings
        </button>
      </nav>
      <div className="pause-dev__subpanel" role="tabpanel">
        <DevHudRings />
      </div>
    </div>
  )
}
