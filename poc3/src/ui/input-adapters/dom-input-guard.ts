import type { KeyboardBindings } from '../../core/input-bindings.ts'
import { isKeyboardPauseCode } from '../../core/input-bindings.ts'

/** True when the event target is inside pause/login/store UI or a form control. */
export function isDomUiTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  return Boolean(
    target.closest(
      '#pause-overlay, #login-root, #store-root, input, button, select, textarea, option',
    ),
  )
}

/** Block press/wheel capture when paused or interacting with DOM UI. */
export function shouldIgnoreDomPress(target: EventTarget | null, captureDom: boolean): boolean {
  return !captureDom || isDomUiTarget(target)
}

/** Allow release events through while paused so held buttons do not stick. */
export function shouldIgnoreDomRelease(target: EventTarget | null): boolean {
  return isDomUiTarget(target)
}

/** Pause binding is always captured — even when gameplay DOM capture is off. */
export function shouldCaptureKeyboardPress(
  bindings: KeyboardBindings,
  code: string,
  target: EventTarget | null,
  captureDom: boolean,
): boolean {
  if (isKeyboardPauseCode(bindings, code)) {
    return true
  }
  return !shouldIgnoreDomPress(target, captureDom)
}

export function shouldCaptureKeyboardRelease(
  bindings: KeyboardBindings,
  code: string,
  target: EventTarget | null,
): boolean {
  if (isKeyboardPauseCode(bindings, code)) {
    return true
  }
  return !shouldIgnoreDomRelease(target)
}

/** @deprecated Use shouldIgnoreDomPress / shouldIgnoreDomRelease. */
export function shouldIgnoreDomGameInput(
  target: EventTarget | null,
  captureDom: boolean,
): boolean {
  return shouldIgnoreDomPress(target, captureDom)
}
