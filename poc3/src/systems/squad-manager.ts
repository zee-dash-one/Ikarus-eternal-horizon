import { BALANCE } from '../core/balancer.ts'
import type { EnemySpawn, WavePlan } from '../core/run-plan.ts'
import type { EnemyEntity } from './enemy-manager.ts'

export type SquadStrategy = 'PatrolGrouping' | 'PatrolAround' | 'LoopBack' | 'Approach' | 'Break'

/** One authored squad per wave. Slots stay stable after casualties; no duplicate owners. */
export class SquadManager {
  strategy: SquadStrategy = 'PatrolGrouping'
  ticks = 0
  leaderId: string | null = null
  private _wave: WavePlan | null = null
  private _age = 0
  private _peak = 0
  start(wave: WavePlan): void {
    this._wave = wave; this._age = 0; this._peak = 0
    this.strategy = 'PatrolGrouping'; this.ticks = BALANCE.combat.squad.groupingTicks; this.leaderId = null
  }
  update(members: readonly EnemyEntity[]): void {
    const cfg = BALANCE.combat.squad
    this._age++
    let count = 0, leader: EnemyEntity | null = null
    for (const craft of members) {
      if (!craft.active || !craft.spawn?.squadId) continue
      count++
      if (!leader || craft.sheet.summary.LVL > leader.sheet.summary.LVL ||
        (craft.sheet.summary.LVL === leader.sheet.summary.LVL && craft.spawn.id < (leader.spawn?.id ?? ''))) leader = craft
    }
    this.leaderId = leader?.spawn?.id ?? null
    this._peak = Math.max(this._peak, count)
    if (count && this._peak > 1 && count === 1 && this.strategy !== 'Break') {
      this.strategy = 'Break'; this.ticks = cfg.breakTicks
    }
    if (--this.ticks > 0) return
    switch (this.strategy) {
      case 'PatrolGrouping': this.strategy = 'PatrolAround'; this.ticks = cfg.patrolTicks; break
      case 'PatrolAround': this.strategy = 'LoopBack'; this.ticks = cfg.loopTicks; break
      case 'LoopBack': this.strategy = 'Approach'; this.ticks = cfg.approachTicks; break
      case 'Approach': this.strategy = 'Break'; this.ticks = cfg.breakTicks; break
      case 'Break': this.strategy = 'PatrolGrouping'; this.ticks = cfg.groupingTicks; break
    }
  }
  /** Writes into caller-owned scratch; geometric recipes are POC3, not imported POC2. */
  target(spawn: EnemySpawn, playerX: number, playerZ: number, out: { x: number; z: number }): void {
    const cfg = BALANCE.combat.squad, n = this._wave?.enemies.length ?? 1
    const phase = this._age / 60
    const centerX = playerX + Math.sin(phase * 0.5) * cfg.sweep
    const centerZ = playerZ - cfg.standoff + (this.strategy === 'Approach' ? cfg.radius : 0)
    if (spawn.formation === 'Circle') {
      const angle = spawn.slot / n * Math.PI * 2 + phase * 0.3
      out.x = centerX + Math.cos(angle) * cfg.radius; out.z = centerZ + Math.sin(angle) * cfg.radius
    } else {
      const rank = Math.ceil(spawn.slot / 2), side = spawn.slot % 2 ? -1 : 1
      out.x = centerX + (spawn.formation === 'V' ? rank * side : spawn.slot - (n - 1) / 2) * cfg.spacing
      out.z = centerZ - (spawn.formation === 'V' ? rank * cfg.spacing : 0)
    }
    if (this.strategy === 'LoopBack') { out.x += Math.sin(phase * 2) * cfg.radius; out.z += Math.cos(phase * 2) * cfg.radius }
  }
  clear(): void { this._wave = null; this.leaderId = null; this._peak = 0 }
}
