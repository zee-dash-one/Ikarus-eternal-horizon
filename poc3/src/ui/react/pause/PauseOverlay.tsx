import { useEffect, useRef } from 'react'
import { useGameUiSnapshot } from '../GameUiContext.tsx'
import { PauseHeader } from './PauseHeader.tsx'
import { PauseBody } from './PauseBody.tsx'
import { PauseFooter } from './PauseFooter.tsx'
import { PauseMenuNavigation } from './PauseMenuNavigation.tsx'

export function PauseOverlay() {
  const ui = useGameUiSnapshot()
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ui.pauseOpen) return
    const previous = document.activeElement
    panel.current?.querySelector<HTMLElement>('button')?.focus()
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [ui.pauseOpen])
  if (!ui.pauseOpen) {
    return null
  }

  return (
    <div id="pause-overlay" className="pause-overlay">
      <div ref={panel} className="pause-overlay__panel" role="dialog" aria-modal="true" aria-label="Partida pausada" onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')
        if (!controls?.length) return
        const first = controls[0], last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }}>
        <PauseHeader />
        <PauseBody />
        <PauseFooter />
      </div>
      <PauseMenuNavigation />
    </div>
  )
}
