import { useEffect } from 'react'
import { pauseMenuNav } from '../../pause-menu-nav.ts'
import { useGameUiSnapshot } from '../GameUiContext.tsx'

/** Keyboard arrows + gamepad poll wiring for pause overlay focus. */
export function PauseMenuNavigation() {
  const ui = useGameUiSnapshot()

  useEffect(() => {
    if (!ui.pauseOpen) {
      pauseMenuNav.detach()
      return
    }
    const root = document.getElementById('pause-overlay')
    if (!root) {
      return
    }
    pauseMenuNav.attach(root)
    return () => {
      pauseMenuNav.detach()
    }
  }, [ui.pauseOpen])

  return null
}
