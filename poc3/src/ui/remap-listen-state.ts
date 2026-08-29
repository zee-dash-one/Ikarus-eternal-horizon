/** True while a control remap listener is capturing the next input. */
let remapListening = false

export function setRemapListening(active: boolean): void {
  remapListening = active
}

export function isRemapListening(): boolean {
  return remapListening
}
