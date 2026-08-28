import { BALANCE } from '../core/balancer.ts'
import type { CharSheetManager } from './char-sheet-manager.ts'

export interface EnergyPort {
  canAfford(cost: number): boolean
  spend(cost: number): boolean
}

export interface EnergyManagerOptions {
  /** Regen gate — true when ship.status.energizing (not dashing/shooting/bombing). */
  readonly canRegen?: () => boolean
  /** Extra regen per second (POC2 EnergyCollector). */
  readonly regenBonus?: () => number
}

/** Shared Summary `ENE` pool — spend, regen delay, recovering gate (POC2 port). */
export class EnergyManager implements EnergyPort {
  private readonly _sheet: CharSheetManager
  private readonly _regenBonus: () => number
  private readonly _regenDelayMaxMs: number
  private _regenDelayMs = 0
  private _canRegen: () => boolean

  constructor(sheet: CharSheetManager, options: EnergyManagerOptions = {}) {
    this._sheet = sheet
    this._canRegen = options.canRegen ?? (() => true)
    this._regenBonus = options.regenBonus ?? (() => 0)
    this._regenDelayMaxMs = BALANCE.energy.recoveringMs
  }

  /** Wire after FiringManager / PlayerManager exist (POC2 run-world `canRegen`). */
  bindRegenGate(canRegen: () => boolean): void {
    this._canRegen = canRegen
  }

  canAfford(cost: number): boolean {
    return this._sheet.summary.ENE >= cost
  }

  spend(cost: number): boolean {
    if (!this._sheet.spendEnergy(cost)) {
      return false
    }
    this._regenDelayMs = this._regenDelayMaxMs
    return true
  }

  updateSim(dt: number): void {
    let remain = dt
    if (this._regenDelayMs > 0) {
      const delayDt = this._regenDelayMs / 1000
      if (remain <= delayDt) {
        this._regenDelayMs -= remain * 1000
        return
      }
      remain -= delayDt
      this._regenDelayMs = 0
    }
    if (!this._canRegen() || remain <= 0) {
      return
    }
    const rate = this._sheet.summary.REG + this._regenBonus()
    this._sheet.addEnergy(rate * remain)
  }
}
