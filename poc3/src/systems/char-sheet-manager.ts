import { BALANCE } from '../core/balancer.ts'
import {
  createDefaultSummary,
  createEmptyCharSheet,
  integritySpeedMultiplier,
  integrityStateFromCur,
  type FullCharSheet,
  type GrantContext,
  type SummarySheet,
} from '../core/sheet/char-sheet.ts'

export type RecalcTrigger = 'equip' | 'effect' | 'level' | 'context'

export class CharSheetManager {
  private _full: FullCharSheet = createEmptyCharSheet()
  private _summary: SummarySheet = createDefaultSummary()
  private readonly _context = new Set<GrantContext>()
  private _contextPatch: Partial<SummarySheet> = {}

  get full(): FullCharSheet {
    return this._full
  }

  get summary(): Readonly<SummarySheet> {
    return this._summary
  }

  static create(): CharSheetManager {
    const mgr = new CharSheetManager()
    mgr.recalcFull()
    return mgr
  }

  setContext(ctx: GrantContext, active: boolean): void {
    if (active) {
      this._context.add(ctx)
    } else {
      this._context.delete(ctx)
    }
    this._applyContextGrants()
    this.recalcSummaryOnly()
  }

  private _applyContextGrants(): void {
    this._contextPatch = {}
    if (this._context.has('dashing')) {
      this._contextPatch.DEF = (this._contextPatch.DEF ?? 0) + 2
    }
  }

  recalcFull(): void {
    const defs = BALANCE.sheet.playerDefaults
    this._summary.integrity_max = defs.integrity_max
    this._summary.DEF = defs.DEF + (this._contextPatch.DEF ?? 0)
    this._summary.MIT = this._summary.DEF / 10
    this._summary.SPD = defs.SPD
    this._summary.ENE = defs.ENE_max
    this._summary.SHD = defs.SHD_max
    this._summary.REG = defs.REG
    this._summary.HP = this._summary.integrity_cur
    this._updateIntegrityState()
    this._applyIntegrityPenalties()
  }

  recalcSummaryOnly(): void {
    this._summary.MIT = this._summary.DEF / 10
    this._applyIntegrityPenalties()
  }

  recalcLevelPartial(): void {
    this._summary.MIT = this._summary.DEF / 10
    this._applyIntegrityPenalties()
  }

  private _applyIntegrityPenalties(): void {
    const mul = integritySpeedMultiplier(this._summary.integrityState)
    const base = BALANCE.sheet.playerDefaults.SPD
    this._summary.SPD = base * mul
    this._summary.S_R = 8 * mul
  }

  private _updateIntegrityState(): void {
    const wasDrifting = this._summary.integrityState === 'DRIFTING'
    this._summary.integrityState = integrityStateFromCur(
      this._summary.integrity_cur,
      this._summary.integrity_max,
      wasDrifting,
    )
    this._summary.HP = this._summary.integrity_cur
  }

  applyIntegrityDamage(amount: number): void {
    if (this._summary.integrityState === 'DEAD') {
      return
    }
    if (this._summary.integrityState === 'DRIFTING') {
      this._summary.integrity_cur = 0
      this._summary.integrityState = 'DEAD'
      this._summary.HP = 0
      return
    }
    this._summary.integrity_cur = Math.max(0, this._summary.integrity_cur - amount)
    this._updateIntegrityState()
    this._applyIntegrityPenalties()
  }

  applyShieldDamage(amount: number): number {
    const absorbed = Math.min(this._summary.SHD, amount)
    this._summary.SHD -= absorbed
    return amount - absorbed
  }

  spendEnergy(amount: number): boolean {
    if (this._summary.ENE < amount) {
      return false
    }
    this._summary.ENE -= amount
    return true
  }

  regenEnergy(dt: number): void {
    const max = BALANCE.sheet.playerDefaults.ENE_max
    this._summary.ENE = Math.min(max, this._summary.ENE + this._summary.REG * dt)
  }
}
