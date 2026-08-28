import { useEffect } from 'react'
import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function StartHint() {
  const ui = useGameUiSnapshot()

  useEffect(() => {
    const root = document.getElementById('start-hint')
    if (!root) {
      return
    }
    if (ui.startHintVisible) {
      root.removeAttribute('hidden')
    } else {
      root.setAttribute('hidden', '')
    }
  }, [ui.startHintVisible])

  if (!ui.startHintVisible) {
    return null
  }

  return (
    <p>
      Press <kbd>Enter</kbd> or click to fly — auto-starting…
    </p>
  )
}
