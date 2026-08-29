import { useMemo, useState } from 'react'
import {
  BIND_ACTION_LABELS,
  clampMouseSteerSensitivity,
  GAMEPLAY_BIND_ACTIONS,
  MOVE_BIND_ACTIONS,
  formatGamepadBinding,
  formatGamepadPauseBinding,
  formatKeyboardBinding,
  formatKeyboardPauseBinding,
  formatMouseBinding,
  MOUSE_BUTTON_ACTIONS,
  MOUSE_STEER_SENSITIVITY_DEFAULT,
  type BindAction,
  type MouseButtonAction,
} from '../../../../core/input-bindings.ts'
import {
  CONTROL_SCHEME_OPTIONS,
  resolveTouchSlotRows,
  type TouchSlotId,
} from '../../../../core/control-display.ts'
import type { InputScheme } from '../../../game-ui-types.ts'
import { useGameUiSnapshot } from '../../GameUiContext.tsx'
import { TabBar } from '../../shared/TabBar.tsx'
import { ControlRemapButton } from '../controls/ControlRemapButton.tsx'
import { MouseSensitivityControl } from '../controls/MouseSensitivityControl.tsx'

type ListenTarget =
  | { readonly kind: 'keyboard'; readonly action: BindAction | 'pause' }
  | { readonly kind: 'mouse'; readonly action: MouseButtonAction }
  | { readonly kind: 'pad'; readonly action: MouseButtonAction | 'pause' }

function KeyboardRemapRows({
  actions,
  listen,
  onListen,
  onAssign,
  onCancel,
}: {
  readonly actions: readonly BindAction[]
  readonly listen: ListenTarget | null
  readonly onListen: (action: BindAction) => void
  readonly onAssign: (action: BindAction, code: string) => void
  readonly onCancel: () => void
}) {
  const ui = useGameUiSnapshot()
  void ui.bindingsRev
  const bindings = ui.controlBindings

  return (
    <>
      {actions.map((action) => (
        <ControlRemapButton
          key={`kb-${action}`}
          label={BIND_ACTION_LABELS[action]}
          value={formatKeyboardBinding(bindings.keyboard, action)}
          listenKind="key"
          listening={listen?.kind === 'keyboard' && listen.action === action}
          onStartListen={() => onListen(action)}
          onKey={(code) => {
            onAssign(action, code)
            onCancel()
          }}
          onMouse={() => undefined}
          onPad={() => undefined}
          onCancel={onCancel}
        />
      ))}
    </>
  )
}

function KeyboardPauseRow({
  listen,
  onListen,
  onAssign,
  onCancel,
}: {
  readonly listen: ListenTarget | null
  readonly onListen: () => void
  readonly onAssign: (code: string) => void
  readonly onCancel: () => void
}) {
  const ui = useGameUiSnapshot()
  void ui.bindingsRev
  const bindings = ui.controlBindings

  return (
    <ControlRemapButton
      key="kb-pause"
      label="Pause"
      value={formatKeyboardPauseBinding(bindings.keyboard)}
      listenKind="key"
      acceptEscapeAsBinding
      listening={listen?.kind === 'keyboard' && listen.action === 'pause'}
      onStartListen={onListen}
      onKey={(code) => {
        onAssign(code)
        onCancel()
      }}
      onMouse={() => undefined}
      onPad={() => undefined}
      onCancel={onCancel}
    />
  )
}

function GamepadPauseRow({
  listen,
  onListen,
  onAssign,
  onCancel,
}: {
  readonly listen: ListenTarget | null
  readonly onListen: () => void
  readonly onAssign: (button: number) => void
  readonly onCancel: () => void
}) {
  const ui = useGameUiSnapshot()
  void ui.bindingsRev
  const bindings = ui.controlBindings

  return (
    <ControlRemapButton
      key="pad-pause"
      label="Pause"
      value={formatGamepadPauseBinding(bindings.gamepad)}
      listenKind="pad"
      listening={listen?.kind === 'pad' && listen.action === 'pause'}
      onStartListen={onListen}
      onKey={() => undefined}
      onMouse={() => undefined}
      onPad={(button) => {
        onAssign(button)
        onCancel()
      }}
      onCancel={onCancel}
    />
  )
}

export function PauseControlsTab() {
  const ui = useGameUiSnapshot()
  void ui.bindingsRev
  const bindings = ui.controlBindings
  const mouseSensitivity = clampMouseSteerSensitivity(
    bindings.mouse.moveSensitivity ?? MOUSE_STEER_SENSITIVITY_DEFAULT,
  )
  const scheme = ui.scheme
  const [listen, setListen] = useState<ListenTarget | null>(null)
  const touchRows = useMemo(() => resolveTouchSlotRows(bindings), [bindings])

  const selectScheme = (next: InputScheme): void => {
    setListen(null)
    ui.setScheme(next)
    ui.pauseHandlers.onSchemeChange(next)
  }

  const finishListen = (): void => {
    setListen(null)
  }

  const keyboardActions =
    scheme === 'mix' ? MOVE_BIND_ACTIONS : [...MOVE_BIND_ACTIONS, ...GAMEPLAY_BIND_ACTIONS]

  const showKeyboardPause = scheme === 'keyboard' || scheme === 'mix'
  const showGamepadPause = scheme === 'gamepad' || scheme === 'mix'

  return (
    <section className="pause-controls">
      <h3 className="pause-controls__title">Input Scheme</h3>
      <TabBar
        tabs={CONTROL_SCHEME_OPTIONS}
        active={scheme}
        onSelect={selectScheme}
        className="pause-tab-group pause-controls__schemes"
      />

      {showKeyboardPause || showGamepadPause ? (
        <>
          <h4 className="pause-controls__subtitle">Pause</h4>
          <dl className="pause-controls__map">
            {showKeyboardPause ? (
              <KeyboardPauseRow
                listen={listen}
                onListen={() => setListen({ kind: 'keyboard', action: 'pause' })}
                onAssign={(code) => ui.pauseHandlers.assignKeyboardPause(code)}
                onCancel={finishListen}
              />
            ) : null}
            {showGamepadPause ? (
              <GamepadPauseRow
                listen={listen}
                onListen={() => setListen({ kind: 'pad', action: 'pause' })}
                onAssign={(button) => ui.pauseHandlers.assignGamepadPause(button)}
                onCancel={finishListen}
              />
            ) : null}
          </dl>
        </>
      ) : null}

      {scheme === 'keyboard' || scheme === 'mix' ? (
        <>
          <h4 className="pause-controls__subtitle">
            {scheme === 'mix' ? 'Movement (keyboard)' : 'Keyboard'}
          </h4>
          <dl className="pause-controls__map">
            <KeyboardRemapRows
              actions={keyboardActions}
              listen={listen}
              onListen={(action) => setListen({ kind: 'keyboard', action })}
              onAssign={(action, code) => ui.pauseHandlers.assignKeyboard(action, code)}
              onCancel={finishListen}
            />
          </dl>
        </>
      ) : null}

      {scheme === 'mix' ? (
        <>
          <h4 className="pause-controls__subtitle">Movement (mouse)</h4>
          <div className="pause-controls__map pause-controls__map--option">
            <label className="pause-controls__toggle">
              <input
                type="checkbox"
                checked={bindings.mouse.moveEnabled}
                onChange={(e) => ui.pauseHandlers.setMouseMoveEnabled(e.target.checked)}
              />
              <span>Use mouse to steer</span>
            </label>
            {bindings.mouse.moveEnabled ? (
              <MouseSensitivityControl ui={ui} sensitivity={mouseSensitivity} />
            ) : null}
            <p className="pause-controls__note">
              Move the mouse to hold a direction (like keeping a key pressed). Movement stops
              after 500&nbsp;ms without input. Higher sensitivity needs less motion to steer.
              Click the play area to capture the cursor; your pause key opens pause and releases
              it.
            </p>
          </div>

          <h4 className="pause-controls__subtitle">Actions (keyboard)</h4>
          <dl className="pause-controls__map">
            <KeyboardRemapRows
              actions={GAMEPLAY_BIND_ACTIONS}
              listen={listen}
              onListen={(action) => setListen({ kind: 'keyboard', action })}
              onAssign={(action, code) => ui.pauseHandlers.assignKeyboard(action, code)}
              onCancel={finishListen}
            />
          </dl>

          <h4 className="pause-controls__subtitle">Actions (mouse buttons)</h4>
          <dl className="pause-controls__map">
            {MOUSE_BUTTON_ACTIONS.map((action) => (
              <ControlRemapButton
                key={`mouse-${action}`}
                label={BIND_ACTION_LABELS[action]}
                value={formatMouseBinding(bindings.mouse, action)}
                listenKind="mouse"
                listening={listen?.kind === 'mouse' && listen.action === action}
                onStartListen={() => setListen({ kind: 'mouse', action })}
                onKey={() => undefined}
                onMouse={(input) => {
                  ui.pauseHandlers.assignMouseInput(action, input)
                  finishListen()
                }}
                onPad={() => undefined}
                onCancel={finishListen}
              />
            ))}
          </dl>
        </>
      ) : null}

      {scheme === 'gamepad' ? (
        <>
          <p className="pause-controls__note">Move with the left stick.</p>
          <h4 className="pause-controls__subtitle">Gamepad Buttons</h4>
          <dl className="pause-controls__map">
            {MOUSE_BUTTON_ACTIONS.map((action) => (
              <ControlRemapButton
                key={`pad-${action}`}
                label={BIND_ACTION_LABELS[action]}
                value={formatGamepadBinding(bindings.gamepad, action)}
                listenKind="pad"
                listening={listen?.kind === 'pad' && listen.action === action}
                onStartListen={() => setListen({ kind: 'pad', action })}
                onKey={() => undefined}
                onMouse={() => undefined}
                onPad={(button) => {
                  ui.pauseHandlers.assignGamepadButton(action, button)
                  finishListen()
                }}
                onCancel={finishListen}
              />
            ))}
          </dl>
        </>
      ) : null}

      {scheme === 'touch' ? (
        <>
          <p className="pause-controls__note">Move with the virtual stick.</p>
          <h4 className="pause-controls__subtitle">On-screen Buttons</h4>
          <dl className="pause-controls__map">
            <div className="pause-controls__row">
              <dt>Pause</dt>
              <dd>Top-right button (fixed)</dd>
            </div>
            {touchRows.map((row) => (
              <div key={row.id} className="pause-controls__row">
                <dt>{row.label}</dt>
                <dd>
                  <select
                    className="pause-controls__select"
                    value={bindings.touch[row.id as TouchSlotId]}
                    onChange={(e) => {
                      ui.pauseHandlers.assignTouchSlot(
                        row.id as TouchSlotId,
                        e.target.value as BindAction,
                      )
                    }}
                  >
                    {GAMEPLAY_BIND_ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {BIND_ACTION_LABELS[action]}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      <button
        type="button"
        className="pause-controls__reset"
        onClick={() => {
          setListen(null)
          ui.pauseHandlers.resetControlBindings()
        }}
      >
        Reset to defaults
      </button>
    </section>
  )
}
