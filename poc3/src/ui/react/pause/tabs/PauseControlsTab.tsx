import { CONTROL_SCHEME_OPTIONS, resolveControlBindings } from '../../../../core/control-display.ts'
import type { InputScheme } from '../../../game-ui-types.ts'
import { useGameUiSnapshot } from '../../GameUiContext.tsx'
import { TabBar } from '../../shared/TabBar.tsx'

export function PauseControlsTab() {
  const ui = useGameUiSnapshot()
  const bindings = resolveControlBindings(ui.scheme)

  const selectScheme = (scheme: InputScheme): void => {
    ui.setScheme(scheme)
    ui.pauseHandlers.onSchemeChange(scheme)
  }

  return (
    <section className="pause-controls">
      <h3 className="pause-controls__title">Input Scheme</h3>
      <TabBar
        tabs={CONTROL_SCHEME_OPTIONS}
        active={ui.scheme}
        onSelect={selectScheme}
        className="pause-tab-group pause-controls__schemes"
      />
      <h4 className="pause-controls__subtitle">Default Bindings</h4>
      <dl className="pause-controls__map">
        {bindings.map((row) => (
          <div key={row.label} className="pause-controls__row">
            <dt>{row.label}</dt>
            <dd>{row.binding}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
