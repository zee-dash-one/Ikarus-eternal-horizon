import { BALANCE } from '../core/balancer.ts'
import { MATERIALS, type MaterialId } from '../core/run-economy.ts'

export class RunInventory {
  private readonly _stock: Record<MaterialId, number> = { metalScrap: 0, prismaticCrystal: 0, denseCore: 0, darkMatter: 0 }
  get stock(): Readonly<Record<MaterialId, number>> { return this._stock }
  tryAdd(id: MaterialId, amount: number): number {
    if (!Number.isSafeInteger(amount) || amount <= 0) return 0
    const accepted = Math.min(amount, BALANCE.economy.inventory[id] - this._stock[id])
    this._stock[id] += accepted
    return accepted
  }
  canPay(cost: Partial<Record<MaterialId, number>>): boolean {
    return MATERIALS.every((id) => this._stock[id] >= (cost[id] ?? 0))
  }
  pay(cost: Partial<Record<MaterialId, number>>): boolean {
    if (!this.canPay(cost)) return false
    for (const id of MATERIALS) this._stock[id] -= cost[id] ?? 0
    return true
  }
}
