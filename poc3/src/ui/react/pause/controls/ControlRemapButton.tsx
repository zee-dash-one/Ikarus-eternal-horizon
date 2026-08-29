import { useEffect, useRef } from 'react'
import type { MouseBindInput } from '../../../../core/input-bindings.ts'
import {
  formatGamepadButton,
  formatKeyCode,
  formatMouseInput,
} from '../../../../core/input-bindings.ts'
import { setRemapListening } from '../../../remap-listen-state.ts'

export type RemapListenKind = 'key' | 'mouse' | 'pad'

interface ControlRemapButtonProps {
  readonly label: string
  readonly value: string
  readonly listenKind: RemapListenKind
  readonly listening: boolean
  readonly onStartListen: () => void
  readonly onKey: (code: string) => void
  readonly onMouse: (input: MouseBindInput) => void
  readonly onPad: (button: number) => void
  readonly onCancel: () => void
  /** When true, Escape assigns instead of cancelling (pause key remap). */
  readonly acceptEscapeAsBinding?: boolean
}

export function ControlRemapButton({
  label,
  value,
  listenKind,
  listening,
  onStartListen,
  onKey,
  onMouse,
  onPad,
  onCancel,
  acceptEscapeAsBinding = false,
}: ControlRemapButtonProps) {
  const heldPadRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!listening) {
      setRemapListening(false)
      return
    }
    setRemapListening(true)
    heldPadRef.current = new Set()

    const onKeyDown = (e: KeyboardEvent): void => {
      if (listenKind !== 'key' && listenKind !== 'mouse') {
        return
      }
      if (e.code === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (acceptEscapeAsBinding && listenKind === 'key') {
          onKey('Escape')
          return
        }
        onCancel()
        return
      }
      if (listenKind !== 'key') {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      onKey(e.code)
    }

    const onMouseDown = (e: MouseEvent): void => {
      if (listenKind !== 'mouse') {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      onMouse(e.button)
    }

    const onWheel = (e: WheelEvent): void => {
      if (listenKind !== 'mouse') {
        return
      }
      if (e.deltaY === 0) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      onMouse(e.deltaY < 0 ? 'wheelUp' : 'wheelDown')
    }

    const onContextMenu = (e: Event): void => {
      if (listenKind !== 'mouse') {
        return
      }
      e.preventDefault()
    }

    let frame = 0
    const pollPad = (): void => {
      if (listenKind !== 'pad') {
        return
      }
      const pads = navigator.getGamepads?.() ?? []
      const pad = pads[0]
      if (!pad) {
        frame = requestAnimationFrame(pollPad)
        return
      }
      for (let i = 0; i < pad.buttons.length; i++) {
        const button = pad.buttons[i]
        if (!button) {
          continue
        }
        const down = button.pressed || button.value >= 0.35
        if (down && !heldPadRef.current.has(i)) {
          heldPadRef.current.add(i)
          onPad(i)
          return
        }
        if (!down) {
          heldPadRef.current.delete(i)
        }
      }
      frame = requestAnimationFrame(pollPad)
    }

    if (listenKind === 'pad') {
      const pads = navigator.getGamepads?.() ?? []
      const pad = pads[0]
      if (pad) {
        for (let i = 0; i < pad.buttons.length; i++) {
          const button = pad.buttons[i]
          if (button && (button.pressed || button.value >= 0.35)) {
            heldPadRef.current.add(i)
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('mousedown', onMouseDown, true)
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    window.addEventListener('contextmenu', onContextMenu, true)
    if (listenKind === 'pad') {
      frame = requestAnimationFrame(pollPad)
    }

    return () => {
      setRemapListening(false)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('mousedown', onMouseDown, true)
      window.removeEventListener('wheel', onWheel, true)
      window.removeEventListener('contextmenu', onContextMenu, true)
      cancelAnimationFrame(frame)
    }
  }, [acceptEscapeAsBinding, listenKind, listening, onCancel, onKey, onMouse, onPad])

  const listenHint =
    listenKind === 'mouse'
      ? 'Click, scroll, or Esc…'
      : listenKind === 'pad'
        ? 'Press a button…'
        : acceptEscapeAsBinding
          ? 'Press a key (Esc ok)…'
          : 'Press a key…'

  return (
    <div className="pause-controls__row">
      <dt>{label}</dt>
      <dd>
        <button
          type="button"
          className={`pause-controls__bind${listening ? ' pause-controls__bind--listen' : ''}`}
          onClick={onStartListen}
        >
          {listening ? listenHint : value}
        </button>
      </dd>
    </div>
  )
}

export function formatListenPreview(kind: RemapListenKind, value: string | number): string {
  if (kind === 'key') {
    return formatKeyCode(String(value))
  }
  if (kind === 'mouse') {
    if (value === 'wheelUp' || value === 'wheelDown') {
      return formatMouseInput(value)
    }
    return formatMouseInput(Number(value))
  }
  return formatGamepadButton(Number(value))
}
