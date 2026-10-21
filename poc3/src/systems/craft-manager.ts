import { BALANCE } from '../core/balancer.ts'
import type { WeaponId } from '../core/player-shot.ts'
import type { RunRecipe } from '../core/run-economy.ts'
import type { RunContext } from './run-context.ts'

export class CraftManager {
  private _job: { recipe: RunRecipe; remaining: number; weapon: WeaponId } | null = null
  error: string | null = null
  constructor(private readonly _ctx: RunContext) {}
  get job(): Readonly<{ recipe: RunRecipe; remaining: number }> | null { return this._job }
  start(id: string, paused: boolean): boolean {
    this.error = null
    const ctx = this._ctx, recipe = BALANCE.economy.recipes.find((row) => row.id === id)
    if (ctx.disposed || !paused || ctx.results.metadata.mode === 'survivor' || ctx.waves?.phase !== 'ACTIVE' || ctx.sheet.summary.integrityState === 'DEAD') return this._fail('Abra o laboratório durante a pausa de uma partida Normal.')
    if (!recipe || this._job) return this._fail('Projeto indisponível ou laboratório ocupado.')
    if ((ctx.waves?.plan.sprintIndex ?? 1) < recipe.minSprint) return this._fail('Projeto ainda não liberado neste setor.')
    if (recipe.output.kind === 'repair' && ctx.sheet.summary.HP >= ctx.sheet.summary.integrity_max) return this._fail('Integridade já está completa.')
    if (recipe.output.kind === 'shield' && ctx.sheet.summary.SHD >= BALANCE.sheet.playerDefaults.SHD_max) return this._fail('Escudo já está completo.')
    if (recipe.output.kind === 'weapon' && ctx.firing.loadout.includes(recipe.output.id as typeof ctx.firing.activeWeapon)) return this._fail('Arma já construída.')
    if (recipe.output.kind === 'upgrade' && ctx.firing.level >= BALANCE.economy.maxWeaponLevel) return this._fail('Arma no nível máximo.')
    if (recipe.output.kind === 'bomb' && ctx.firing.bombCharges >= BALANCE.economy.maxBombs) return this._fail('Capacidade de cargas completa.')
    if (recipe.output.kind === 'equipment' && ctx.equipment.includes(recipe.output.id ?? '')) return this._fail('Equipamento já instalado.')
    if (!ctx.inventory.canPay(recipe.materials) || !ctx.energy.canAfford(recipe.energy)) return this._fail('Materiais ou energia insuficientes.')
    ctx.inventory.pay(recipe.materials); ctx.energy.spend(recipe.energy)
    this._job = { recipe, remaining: recipe.duration, weapon: ctx.firing.activeWeapon }
    return true
  }
  updatePaused(dt: number): void {
    if (!this._job || this._ctx.disposed || !Number.isFinite(dt) || dt <= 0) return
    this._job.remaining = Math.max(0, this._job.remaining - dt)
    if (this._job.remaining > 0) return
    const output = this._job.recipe.output, ctx = this._ctx
    if (output.kind === 'repair') ctx.sheet.restoreIntegrity(output.amount)
    else if (output.kind === 'shield') ctx.sheet.restoreShield(output.amount)
    else if (output.kind === 'weapon') ctx.firing.unlock(output.id ?? '')
    else if (output.kind === 'upgrade') ctx.firing.upgrade(this._job.weapon)
    else if (output.kind === 'bomb') ctx.firing.addBombs(output.amount)
    else if (output.kind === 'equipment') ctx.installEquipment(output.id ?? '')
    this._job = null
    ctx.simulation.refreshSnapshot()
    ctx.events.publish({ type: 'sound_cue', cue: 'craft_complete' })
  }
  cancel(): void { this._job = null }
  private _fail(message: string): false { this.error = message; return false }
}
