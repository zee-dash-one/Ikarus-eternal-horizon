import type { CharSheetManager } from './char-sheet-manager.ts'
import type { EventBus } from '../core/event.ts'

function isDead(sheet: CharSheetManager): boolean { return sheet.summary.integrityState === 'DEAD' }

export interface DamageRequest {
  readonly target: CharSheetManager
  readonly rawDamage: number
  readonly collision?: boolean
  readonly otherHp?: number
  readonly scoreCredit?: { readonly eventId: string; readonly kind: 'enemy' | 'miniboss'; readonly creditedToPlayer: boolean }
}

export class DamageManager {
  private readonly _events: EventBus | undefined
  constructor(events?: EventBus) { this._events = events }
  applyMeteorDamage(target: { hp: number }, amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0 || target.hp <= 0) return false
    target.hp = Math.max(0, target.hp - amount)
    return target.hp === 0
  }
  applyDamage(req: DamageRequest): void {
    const sheet = req.target
    const wasDead = isDead(sheet)
    let remaining = req.rawDamage

    if (req.collision && req.otherHp !== undefined) {
      remaining = req.otherHp / 2
    }

    const mitigated = Math.max(0, remaining - sheet.summary.MIT)
    const afterShield = sheet.applyShieldDamage(mitigated)
    if (afterShield > 0) {
      sheet.applyIntegrityDamage(afterShield)
    }
    if (!wasDead && isDead(sheet) && req.scoreCredit) {
      this._events?.publish({ type: 'enemy_destroyed', ...req.scoreCredit })
    }
  }
}
