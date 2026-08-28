import type { CharSheetManager } from './char-sheet-manager.ts'

export class EnergyManager {
  private readonly _sheet: CharSheetManager

  constructor(sheet: CharSheetManager) {
    this._sheet = sheet
  }

  spend(amount: number): boolean {
    return this._sheet.spendEnergy(amount)
  }

  updateSim(dt: number): void {
    this._sheet.regenEnergy(dt)
  }
}
