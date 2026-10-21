import { BALANCE } from '../core/balancer.ts'
import {
  createDefaultSummary,
  createEmptyCharSheet,
  integritySpeedMultiplier,
  integrityStateFromCur,
  ShipStatusTracker,
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
  private _equipment: Partial<Record<'DEF' | 'SPD' | 'S_D' | 'S_R' | 'REG', number>> = {}
  private _combatBaseSpeed: number | null = null
  readonly shipStatus = new ShipStatusTracker()

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

  setEquipment(grants: Partial<Record<'DEF' | 'SPD' | 'S_D' | 'S_R' | 'REG', number>>): void {
    this._equipment = { ...grants }
    this._summary.DEF = BALANCE.sheet.playerDefaults.DEF + (grants.DEF ?? 0) + (this._contextPatch.DEF ?? 0)
    this._summary.MIT = this._summary.DEF / 10
    this._summary.S_D = 10 + (grants.S_D ?? 0)
    this._summary.REG = BALANCE.sheet.playerDefaults.REG + (grants.REG ?? 0)
    this._applyIntegrityPenalties()
  }
  restoreIntegrity(amount: number): void {
    if (this._summary.integrityState === 'DEAD' || amount <= 0) return
    this._summary.integrity_cur = Math.min(this._summary.integrity_max, this._summary.integrity_cur + amount)
    this._updateIntegrityState()
    this._applyIntegrityPenalties()
  }
  restoreShield(amount: number): void {
    if (this._summary.integrityState !== 'DEAD' && amount > 0) this._summary.SHD = Math.min(BALANCE.sheet.playerDefaults.SHD_max, this._summary.SHD + amount)
  }

  setContext(ctx: GrantContext, active: boolean): void {
    if (active) {
      this._context.add(ctx)
    } else {
      this._context.delete(ctx)
    }
    this._applyContextGrants()
    if (this._combatBaseSpeed === null) this.setEquipment(this._equipment)
    else this.recalcSummaryOnly()
  }

  /** Reuse a preallocated enemy CHAR; never construct a sheet on the combat path. */
  resetCombat(hp: number, shield: number, speed: number): void {
    this._combatBaseSpeed = speed
    this._context.clear()
    this._contextPatch = {}
    Object.assign(this._summary, { integrity_max: hp, integrity_cur: hp, HP: hp, SHD: shield,
      DEF: 0, MIT: 0, SPD: speed, S_R: 8, integrityState: 'LIGHT', LVL: 1 })
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
    const base = this._combatBaseSpeed ?? (BALANCE.sheet.playerDefaults.SPD + (this._equipment.SPD ?? 0))
    this._summary.SPD = base * mul
    this._summary.S_R = (8 + (this._equipment.S_R ?? 0)) * mul
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

  addEnergy(amount: number): void {
    const max = BALANCE.sheet.playerDefaults.ENE_max
    this._summary.ENE = Math.min(max, this._summary.ENE + amount)
  }
}
