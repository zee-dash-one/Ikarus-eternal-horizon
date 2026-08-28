import { BALANCE } from '../../../core/balancer.ts'
import { getBalancePath, setBalancePath } from '../../balance-path.ts'
import { useGameUiSnapshot } from '../GameUiContext.tsx'

interface RgbaColor {
  r: number
  g: number
  b: number
  a: number
}

function rgbaToHex(color: RgbaColor): string {
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!match) {
    return null
  }
  const value = Number.parseInt(match[1], 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

export function BalanceNumber({
  path,
  label,
  step = 0.1,
  round,
  min,
  max,
}: {
  readonly path: string
  readonly label?: string
  readonly step?: number
  readonly round?: 'int'
  readonly min?: number
  readonly max?: number
}) {
  const ui = useGameUiSnapshot()
  void ui.balanceRev
  const value = getBalancePath(BALANCE as unknown as Record<string, unknown>, path) as number

  return (
    <label className="pause-dev__field">
      <span>{label ?? path}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => {
          const raw = Number(e.target.value)
          if (!Number.isFinite(raw)) {
            return
          }
          let next = raw
          if (round === 'int') {
            next = Math.round(raw)
          }
          if (min !== undefined) {
            next = Math.max(min, next)
          }
          if (max !== undefined) {
            next = Math.min(max, next)
          }
          setBalancePath(BALANCE as unknown as Record<string, unknown>, path, next)
          ui.pauseHandlers.onBalanceChange()
          ui.bumpBalance()
        }}
      />
    </label>
  )
}

export function BalanceCheckbox({ path, label }: { readonly path: string; readonly label: string }) {
  const ui = useGameUiSnapshot()
  void ui.balanceRev
  const checked = Boolean(getBalancePath(BALANCE as unknown as Record<string, unknown>, path))

  return (
    <label className="pause-dev__field pause-dev__field--check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          setBalancePath(BALANCE as unknown as Record<string, unknown>, path, e.target.checked)
          ui.pauseHandlers.onBalanceChange()
          ui.bumpBalance()
        }}
      />
      {` ${label}`}
    </label>
  )
}

export function BalanceVec3({
  path,
  label,
  step = 0.01,
}: {
  readonly path: string
  readonly label: string
  readonly step?: number
}) {
  const ui = useGameUiSnapshot()
  void ui.balanceRev
  const vec = getBalancePath(BALANCE as unknown as Record<string, unknown>, path) as {
    x: number
    y: number
    z: number
  }

  const setAxis = (axis: 'x' | 'y' | 'z', raw: string) => {
    const v = Number(raw)
    if (!Number.isFinite(v)) {
      return
    }
    vec[axis] = v
    ui.pauseHandlers.onBalanceChange()
    ui.bumpBalance()
  }

  return (
    <div className="pause-dev__vec3">
      <h4 className="pause-dev__subhead">{label}</h4>
      {(['x', 'y', 'z'] as const).map((axis) => (
        <label key={axis} className="pause-dev__field">
          <span>{axis}</span>
          <input type="number" step={step} value={vec[axis]} onChange={(e) => setAxis(axis, e.target.value)} />
        </label>
      ))}
    </div>
  )
}

export function BalanceRgba({
  path,
  label,
}: {
  readonly path: string
  readonly label: string
}) {
  const ui = useGameUiSnapshot()
  void ui.balanceRev
  const color = getBalancePath(BALANCE as unknown as Record<string, unknown>, path) as RgbaColor

  const setRgb = (hex: string) => {
    const rgb = hexToRgb(hex)
    if (!rgb) {
      return
    }
    color.r = rgb.r
    color.g = rgb.g
    color.b = rgb.b
    ui.pauseHandlers.onBalanceChange()
    ui.bumpBalance()
  }

  const setAlpha = (raw: string) => {
    const v = Number(raw)
    if (!Number.isFinite(v)) {
      return
    }
    color.a = Math.max(0, Math.min(1, v))
    ui.pauseHandlers.onBalanceChange()
    ui.bumpBalance()
  }

  return (
    <label className="pause-dev__rgba">
      <span>{label}</span>
      <input
        type="color"
        value={rgbaToHex(color)}
        title={`${label} RGB`}
        onChange={(e) => setRgb(e.target.value)}
      />
      <input
        type="number"
        min={0}
        max={1}
        step={0.05}
        title={`${label} alpha`}
        value={color.a}
        onChange={(e) => setAlpha(e.target.value)}
      />
    </label>
  )
}

export function BalanceSegmentColors({ name, basePath }: { readonly name: string; readonly basePath: string }) {
  return (
    <div className="pause-dev__colors">
      <h4 className="pause-dev__subhead">{name}</h4>
      <BalanceRgba path={`${basePath}.fill`} label="fill" />
      <BalanceRgba path={`${basePath}.track`} label="track" />
      <BalanceRgba path={`${basePath}.outline`} label="outline" />
    </div>
  )
}
