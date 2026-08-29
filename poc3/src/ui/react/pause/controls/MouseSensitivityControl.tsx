import {
  clampMouseSteerSensitivity,
  MOUSE_STEER_SENSITIVITY_DEFAULT,
  MOUSE_STEER_SENSITIVITY_MAX,
  MOUSE_STEER_SENSITIVITY_MIN,
} from '../../../../core/input-bindings.ts'
import type { GameUiController } from '../../../game-ui-controller.ts'

function toSliderUnits(value: number): number {
  return Math.round(clampMouseSteerSensitivity(value) * 100)
}

function fromSliderUnits(units: number): number {
  return clampMouseSteerSensitivity(units / 100)
}

interface MouseSensitivityControlProps {
  readonly ui: GameUiController
  readonly sensitivity: number
}

export function MouseSensitivityControl({ ui, sensitivity }: MouseSensitivityControlProps) {
  const value = clampMouseSteerSensitivity(sensitivity ?? MOUSE_STEER_SENSITIVITY_DEFAULT)
  const sliderValue = toSliderUnits(value)

  const commit = (raw: number): void => {
    ui.pauseHandlers.setMouseMoveSensitivity(raw)
  }

  return (
    <div className="pause-controls__sensitivity">
      <div className="pause-controls__sensitivity-head">
        <span className="pause-controls__sensitivity-label">Steer sensitivity</span>
        <input
          className="pause-controls__sensitivity-input"
          type="number"
          min={MOUSE_STEER_SENSITIVITY_MIN}
          max={MOUSE_STEER_SENSITIVITY_MAX}
          step={0.05}
          value={value}
          onChange={(e) => {
            const raw = Number(e.target.value)
            if (Number.isFinite(raw)) {
              commit(raw)
            }
          }}
        />
        <span className="pause-controls__sensitivity-unit">×</span>
      </div>
      <input
        className="pause-controls__sensitivity-slider"
        type="range"
        min={MOUSE_STEER_SENSITIVITY_MIN * 100}
        max={MOUSE_STEER_SENSITIVITY_MAX * 100}
        step={1}
        value={sliderValue}
        onChange={(e) => {
          commit(fromSliderUnits(Number(e.target.value)))
        }}
      />
    </div>
  )
}
