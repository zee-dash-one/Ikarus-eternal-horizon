/**
 * SDD-G12 — static nipple stick + on-screen combat buttons (POC2 port).
 * nipplejs stays in this View module only; sim reads TouchInputAdapter.
 */

import { create as createNipple } from 'nipplejs'
import { BALANCE } from '../../core/balancer.ts'
import {
  BIND_ACTION_LABELS,
  BIND_ACTION_TO_TOKEN,
  TOUCH_SLOT_IDS,
  touchPauseVirtualToken,
  type TouchSlotBindings,
  type TouchSlotId,
} from '../../core/input-bindings.ts'
import type { VirtualToken } from '../../core/input-types.ts'
import type { TouchInputAdapter } from '../input-adapters/touch-input-adapter.ts'

export interface NippleMove {
  readonly vector: { readonly x: number; readonly y: number }
  readonly force: number
}

export interface NippleHandle {
  on(event: 'move', fn: (evt: unknown, data: NippleMove) => void): void
  on(event: 'end', fn: () => void): void
  destroy(): void
}

export interface NippleFactory {
  (zone: HTMLElement): NippleHandle
}

export interface TouchControlsOptions {
  readonly host: HTMLElement
  readonly adapter: TouchInputAdapter
  readonly getSlots: () => TouchSlotBindings
  readonly nipple?: NippleFactory
  readonly enabled?: 'auto' | boolean
}

type OverlayButtonId = TouchSlotId | 'pause'

const COMBAT_BUTTON_IDS: readonly TouchSlotId[] = TOUCH_SLOT_IDS

const ALL_OVERLAY_BUTTON_IDS: readonly OverlayButtonId[] = [...COMBAT_BUTTON_IDS, 'pause']

const BUTTON_MIN_PX = 44
const BUTTON_ALPHA = 0.48
const INDIGO = '#818cf8'

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return `rgba(129, 140, 248, ${alpha})`
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function prefersTouchOverlay(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const coarse =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  return coarse || 'ontouchstart' in window
}

function defaultNippleFactory(size: number, color: string): NippleFactory {
  return (zone) => {
    const collection = createNipple({
      zone,
      mode: 'static',
      restJoystick: true,
      position: { left: '50%', top: '50%' },
      size,
      color,
    })
    return {
      on(event, fn) {
        if (event === 'move') {
          collection.on('move', (evt) => {
            const moveFn = fn as (evt: unknown, data: NippleMove) => void
            moveFn(evt, { vector: evt.data.vector, force: evt.data.force })
          })
        } else {
          collection.on('end', () => {
            ;(fn as () => void)()
          })
        }
      },
      destroy() {
        collection.destroy()
      },
    }
  }
}

function tokenForButton(id: OverlayButtonId, slots: TouchSlotBindings): VirtualToken {
  if (id === 'pause') {
    return touchPauseVirtualToken()
  }
  return BIND_ACTION_TO_TOKEN[slots[id]]
}

function labelForButton(id: OverlayButtonId, slots: TouchSlotBindings): string {
  if (id === 'pause') {
    return 'Pause'
  }
  return BIND_ACTION_LABELS[slots[id]]
}

function createOverlayButton(
  id: OverlayButtonId,
  onDown: (id: OverlayButtonId) => void,
  onUp: (id: OverlayButtonId) => void,
): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.dataset.overlayButton = id
  btn.className = `touch-controls__btn${id === 'fire' ? ' touch-controls__btn--fire' : ''}`
  const down = (event: Event): void => {
    event.preventDefault()
    onDown(id)
  }
  const up = (event: Event): void => {
    event.preventDefault()
    onUp(id)
  }
  btn.addEventListener('pointerdown', down)
  btn.addEventListener('pointerup', up)
  btn.addEventListener('pointercancel', up)
  return btn
}

export class TouchControls {
  private readonly _adapter: TouchInputAdapter
  private readonly _getSlots: () => TouchSlotBindings
  private readonly _enabled: 'auto' | boolean
  private readonly _root: HTMLElement
  private readonly _zone: HTMLElement
  private readonly _cluster: HTMLElement
  private readonly _pauseCorner: HTMLElement
  private readonly _buttons = new Map<OverlayButtonId, HTMLButtonElement>()
  private readonly _stickColor: string
  private readonly _nipple: NippleHandle
  private _visible = false
  private _disposed = false

  constructor(options: TouchControlsOptions) {
    this._adapter = options.adapter
    this._getSlots = options.getSlots
    this._enabled = options.enabled ?? 'auto'
    const touch = BALANCE.controls.touch
    this._stickColor = touch.stickColor

    this._root = document.createElement('div')
    this._root.dataset.touchControls = 'overlay'
    this._root.className = 'touch-controls'
    this._root.style.setProperty('--touch-btn-alpha', String(BUTTON_ALPHA))
    this._root.style.setProperty('--touch-fire-color', withAlpha(this._stickColor, BUTTON_ALPHA))
    this._root.style.setProperty('--touch-btn-color', withAlpha(INDIGO, BUTTON_ALPHA))

    const inset = 'max(12px, env(safe-area-inset-left, 0px))'
    const bottomInset = 'max(12px, env(safe-area-inset-bottom, 0px))'
    const topInset = 'max(12px, env(safe-area-inset-top, 0px))'
    const rightInset = 'max(12px, env(safe-area-inset-right, 0px))'
    const zoneSize = Math.max(touch.stickSize, BUTTON_MIN_PX)

    this._zone = document.createElement('div')
    this._zone.dataset.zone = 'stick'
    this._zone.className = 'touch-controls__stick'
    this._zone.style.cssText = [
      `width:${zoneSize}px`,
      `height:${zoneSize}px`,
      `margin:0 0 ${bottomInset} ${inset}`,
    ].join(';')

    this._pauseCorner = document.createElement('div')
    this._pauseCorner.dataset.zone = 'pause'
    this._pauseCorner.className = 'touch-controls__pause'
    this._pauseCorner.style.margin = `${topInset} ${rightInset} 0 0`

    this._cluster = document.createElement('div')
    this._cluster.className = 'touch-controls__cluster'
    this._cluster.style.cssText = [
      `margin:0 ${rightInset} ${bottomInset} 0`,
    ].join(';')

    const onDown = (id: OverlayButtonId): void => {
      if (!this._visible) {
        return
      }
      this._adapter.press(tokenForButton(id, this._getSlots()))
    }
    const onUp = (id: OverlayButtonId): void => {
      this._adapter.release(tokenForButton(id, this._getSlots()))
    }

    const pauseBtn = createOverlayButton('pause', onDown, onUp)
    this._buttons.set('pause', pauseBtn)
    this._pauseCorner.append(pauseBtn)

    for (const id of COMBAT_BUTTON_IDS) {
      const btn = createOverlayButton(id, onDown, onUp)
      this._buttons.set(id, btn)
      this._cluster.append(btn)
    }

    this._root.append(this._zone, this._pauseCorner, this._cluster)
    options.host.append(this._root)

    const factory = options.nipple ?? defaultNippleFactory(touch.stickSize, touch.stickColor)
    this._nipple = factory(this._zone)
    this._nipple.on('move', (_evt, data) => {
      this._onNippleMove(data)
    })
    this._nipple.on('end', () => {
      if (this._visible) {
        this._adapter.setAxis(0, 0)
      }
    })

    this.syncSlots(this._getSlots())
    this.syncVisibility()
  }

  get visible(): boolean {
    return this._visible
  }

  setVisible(visible: boolean): void {
    this._visible = visible
    this._root.style.display = visible ? 'block' : 'none'
    if (visible) {
      this._root.parentElement?.append(this._root)
    }
    if (!visible) {
      this._releaseAll()
    }
  }

  syncSlots(slots: TouchSlotBindings): void {
    this._root.style.setProperty('--touch-fire-color', withAlpha(this._stickColor, BUTTON_ALPHA))
    for (const id of TOUCH_SLOT_IDS) {
      const btn = this._buttons.get(id)
      if (!btn) {
        continue
      }
      btn.textContent = labelForButton(id, slots)
      btn.classList.toggle('touch-controls__btn--fire', slots[id] === 'shoot')
    }
    const pauseBtn = this._buttons.get('pause')
    if (pauseBtn) {
      pauseBtn.textContent = 'Pause'
    }
  }

  syncVisibility(): void {
    if (this._enabled === true) {
      this.setVisible(true)
      return
    }
    if (this._enabled === false) {
      this.setVisible(false)
      return
    }
    this.setVisible(prefersTouchOverlay())
  }

  dispose(): void {
    if (this._disposed) {
      return
    }
    this._disposed = true
    this._releaseAll()
    this._nipple.destroy()
    this._root.remove()
  }

  private _onNippleMove(data: NippleMove): void {
    if (!this._visible) {
      return
    }
    const x = data.vector.x
    const y = data.vector.y
    if (Math.hypot(x, y) < BALANCE.controls.touch.deadzone) {
      this._adapter.setAxis(0, 0)
      return
    }
    this._adapter.setAxis(x, -y)
  }

  private _releaseAll(): void {
    this._adapter.setAxis(0, 0)
    for (const id of ALL_OVERLAY_BUTTON_IDS) {
      this._adapter.release(tokenForButton(id, this._getSlots()))
    }
  }
}
