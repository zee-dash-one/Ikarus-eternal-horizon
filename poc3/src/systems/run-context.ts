import { createEventBus } from '../core/event.ts'
import { RunInputState } from '../core/run-input.ts'
import { CharSheetManager } from './char-sheet-manager.ts'
import { EnergyManager } from './energy-manager.ts'
import { PlayerManager } from './player-manager.ts'
import { FiringManager } from './firing-manager.ts'
import { ShotManager } from './shot-manager.ts'
import { RunSimulation } from './run-simulation.ts'
import type { RunResultManager } from './run-result-manager.ts'
import type { PreparedWorld } from './run-preparation-manager.ts'
import { requirePreparation } from '../core/seeded-random.ts'
import { WaveManager } from './wave-manager.ts'
import { BALANCE } from '../core/balancer.ts'
import { deriveSeed, seededRandom } from '../core/seeded-random.ts'
import { RunInventory } from './run-inventory.ts'
import { CraftManager } from './craft-manager.ts'
import { DropManager } from './drop-manager.ts'
import type { EquipmentStat } from '../core/run-economy.ts'
import { CombatManager } from './combat-manager.ts'

/** Every mutable gameplay dependency lives for exactly one attempt. */
export class RunContext {
  readonly input = new RunInputState()
  readonly sheet = CharSheetManager.create()
  readonly events = createEventBus()
  readonly energy = new EnergyManager(this.sheet)
  readonly shots = new ShotManager()
  readonly player = new PlayerManager(this.input, this.sheet, this.energy)
  readonly firing: FiringManager
  readonly inventory = new RunInventory()
  readonly equipment: string[] = []
  readonly crafting = new CraftManager(this)
  readonly drops: DropManager
  readonly simulation: RunSimulation
  readonly combat = new CombatManager(this)
  waves: WaveManager | null = null
  private _disposed = false
  private _prepared: PreparedWorld | null = null
  private readonly _cleanups = new Set<() => void>()
  constructor(readonly results: RunResultManager) {
    this.firing = new FiringManager(this.input, this.energy, this.sheet, this.shots, results.metadata.mode)
    this.drops = new DropManager(this.inventory, seededRandom(deriveSeed(results.metadata.seed, results.metadata.contentVersion, 'loot')))
    this.sheet.full.special.Primary_Weapon.itemId = 'laser'
    this.energy.bindRegenGate(() => this.sheet.shipStatus.energizing)
    this.shots.onExpire = (shot) => this.combat.explode(shot)
    this.simulation = new RunSimulation(this)
  }
  installEquipment(id: string): boolean {
    if (this.results.metadata.mode === 'survivor' || this.equipment.includes(id)) return false
    const item = BALANCE.economy.equipment.find((row) => row.id === id)
    const slot = this.sheet.full.generic.find((row) => row.itemId === null)
    if (!item || !slot) return false
    slot.itemId = id; this.equipment.push(id)
    const grants: Partial<Record<EquipmentStat, number>> = {}
    for (const entry of BALANCE.economy.equipment) if (this.equipment.includes(entry.id)) {
      for (const [stat, amount] of Object.entries(entry.grants)) grants[stat as EquipmentStat] = (grants[stat as EquipmentStat] ?? 0) + amount
    }
    this.sheet.setEquipment(grants)
    return true
  }
  get disposed(): boolean { return this._disposed }
  get prepared(): PreparedWorld | null { return this._prepared }
  installPreparedWorld(world: PreparedWorld): void {
    requirePreparation(!this._disposed && !this._prepared, 'contexto já preparado/descartado')
    const waves = new WaveManager(this, world)
    this.waves = waves
    this.results.enableEntityCredits()
    this._prepared = Object.freeze({ ...world, get plan() { return waves.plan }, get sector() { return waves.sector } })
    this.simulation.refreshSnapshot()
  }
  own(cleanup: () => void): void {
    if (this._disposed) cleanup()
    else this._cleanups.add(cleanup)
  }
  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this.simulation.dispose()
    this.waves?.dispose()
    this.crafting.cancel()
    this.drops.dispose()
    this.results.cancel()
    this.firing.releaseFireHold()
    for (const shot of [...this.shots.activeShots]) this.shots.release(shot)
    this.events.drain()
    for (const cleanup of this._cleanups) cleanup()
    this._cleanups.clear()
    this._prepared = null
  }
}
