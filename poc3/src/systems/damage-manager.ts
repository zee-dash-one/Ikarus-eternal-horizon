import type { CharSheetManager } from './char-sheet-manager.ts'

export interface DamageRequest {
  readonly target: CharSheetManager
  readonly rawDamage: number
  readonly collision?: boolean
  readonly otherHp?: number
}

export class DamageManager {
  applyDamage(req: DamageRequest): void {
    const sheet = req.target
    let remaining = req.rawDamage

    if (req.collision && req.otherHp !== undefined) {
      remaining = req.otherHp / 2
    }

    const mitigated = Math.max(0, remaining - sheet.summary.MIT)
    const afterShield = sheet.applyShieldDamage(mitigated)
    if (afterShield > 0) {
      sheet.applyIntegrityDamage(afterShield)
    }
  }
}
