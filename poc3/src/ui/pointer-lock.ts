import type { InputScheme } from '../core/input-types.ts'

export function shouldCapturePointerForMix(
  scheme: InputScheme,
  moveEnabled: boolean,
  inRun: boolean,
  paused: boolean,
): boolean {
  return scheme === 'mix' && moveEnabled && inRun && !paused
}

export function releasePointerLock(host?: HTMLElement | null): void {
  const locked = document.pointerLockElement
  if (!locked) {
    return
  }
  if (host && locked !== host) {
    return
  }
  document.exitPointerLock()
}

export function requestPointerLock(host: HTMLElement): void {
  if (document.pointerLockElement === host) {
    return
  }
  void host.requestPointerLock()
}
