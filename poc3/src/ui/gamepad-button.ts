/** True when a standard Gamepad API button reads as down (handles analog triggers). */
export function isGamepadButtonDown(button: GamepadButton | undefined): boolean {
  if (!button) {
    return false
  }
  return button.pressed || button.value >= 0.35
}

/** First connected pad in the list (browser slot order). */
export function firstConnectedGamepad(): Gamepad | null {
  const pads = navigator.getGamepads?.() ?? []
  for (const pad of pads) {
    if (pad) {
      return pad
    }
  }
  return null
}
