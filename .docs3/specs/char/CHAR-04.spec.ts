import { describe, it, expect } from 'vitest'
import { CharSheetManager } from '../../../poc3/src/systems/char-sheet-manager.ts'
import { integrityStateFromCur } from '../../../poc3/src/core/sheet/char-sheet.ts'

describe('CHAR-04 — Integrity ladder incl. DRIFTING', () => {
  it('integrity_cur reaching 0 sets DRIFTING — not DEAD', () => {
    const mgr = CharSheetManager.create()
    mgr.applyIntegrityDamage(mgr.summary.integrity_cur)
    expect(mgr.summary.integrityState).toBe('DRIFTING')
    expect(mgr.summary.integrityState).not.toBe('DEAD')
  })

  it('next incoming damage while DRIFTING sets DEAD', () => {
    const mgr = CharSheetManager.create()
    mgr.applyIntegrityDamage(mgr.summary.integrity_cur)
    expect(mgr.summary.integrityState).toBe('DRIFTING')
    mgr.applyIntegrityDamage(1)
    expect(mgr.summary.integrityState).toBe('DEAD')
  })

  it('LIGHT / MEDIUM / SEVERE bands follow integrity_max thresholds', () => {
    expect(integrityStateFromCur(100, 100, false)).toBe('LIGHT')
    expect(integrityStateFromCur(50, 100, false)).toBe('MEDIUM')
    expect(integrityStateFromCur(25, 100, false)).toBe('SEVERE')
    expect(integrityStateFromCur(0, 100, false)).toBe('DRIFTING')
  })

  it.todo('MEDIUM applies 80% to published SPD and S_R; SEVERE 50%; DRIFTING 10%')

  it.todo('penalties re-evaluate on every damage application')

  it.todo('player DEAD ends the run (Q04)')
})
