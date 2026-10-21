import { BALANCE } from '../core/balancer.ts'
import { SIM_DT } from '../core/game-loop.ts'
import { EMPTY_RUN_INPUT } from '../core/run-input.ts'
import type { RunInputFrame } from '../core/run-input.ts'
import type { WorldSnapshot } from '../core/world-snapshot.ts'
import type { DomainEvent } from '../core/event.ts'
import type { RunContext } from './run-context.ts'

/** Fixed-step gameplay only: no renderer, camera, wall clock, DOM or persistence. */
export class RunSimulation {
  private _tick = 0
  private _dead = false
  private _disposed = false
  private _paused = false
  private _snapshot: WorldSnapshot
  private _events: readonly DomainEvent[] = []
  constructor(private readonly _context: RunContext) { this._snapshot = this._publish() }
  get snapshot(): WorldSnapshot { return this._snapshot }
  get dead(): boolean { return this._dead }
  get events(): readonly DomainEvent[] { return this._events }
  setPaused(paused: boolean): void {
    if (!this._disposed && paused !== this._paused) { this._paused = paused; this._snapshot = this._publish() }
  }
  refreshSnapshot(): void { if (!this._disposed) this._snapshot = this._publish() }
  step(input: RunInputFrame = EMPTY_RUN_INPUT): void {
    if (this._disposed || this._dead || this._paused) return
    const ctx = this._context
    ctx.input.load(input)
    this._tick++
    const combatEnabled = !ctx.waves || ctx.waves.step()
    if (combatEnabled) {
      ctx.results.advance(SIM_DT)
      const previousX = ctx.player.pose.x, previousZ = ctx.player.pose.z
      ctx.player.updateSim(SIM_DT)
      if (ctx.sheet.summary.integrityState !== 'DEAD') ctx.firing.updateSim(SIM_DT, ctx.player.pose)
      ctx.sheet.shipStatus.tick(SIM_DT * 1000)
      ctx.energy.updateSim(SIM_DT)
      ctx.shots.updateSim(SIM_DT)
      if (ctx.prepared) {
        ctx.prepared.enemies.updateSim(SIM_DT, ctx.player.pose.x, ctx.player.pose.z, ctx.waves?.random)
        ctx.prepared.meteors.updateSim(SIM_DT)
        ctx.combat.resolve(previousX, previousZ)
      }
    }
    this._events = Object.freeze(ctx.events.drain())
    ctx.waves?.observe(this._events)
    if (combatEnabled && ctx.results.metadata.mode !== 'survivor') {
      for (const event of this._events) if (event.type === 'drop_requested') ctx.drops.onSourceKilled(event)
      ctx.drops.updateSim(SIM_DT, ctx.player.pose.x, ctx.player.pose.z, ctx.events)
    }
    for (const event of this._events) {
      if (combatEnabled && (event.type === 'enemy_destroyed' || event.type === 'meteor_destroyed')) ctx.results.applyEvent(event)
    }
    if (ctx.prepared) ctx.results.pruneEntityCredits((id) =>
      ctx.prepared?.enemies.staged.some((e) => e.active && e.spawn?.id === id) === true ||
      ctx.prepared?.meteors.staged.some((m) => m.active && m.spawn?.id === id) === true)
    this._dead = ctx.sheet.summary.integrityState === 'DEAD'
    this._snapshot = this._publish()
  }
  dispose(): void { this._disposed = true; this._events = [] }
  private _publish(): WorldSnapshot {
    const ctx = this._context
    const s = ctx.sheet.summary
    return Object.freeze({
      encounter: ctx.waves ? Object.freeze({ phase: ctx.waves.phase, sprint: ctx.waves.plan.sprintIndex,
        wave: ctx.waves.waveIndex, sector: ctx.waves.plan.sectorId, entryProgress: ctx.waves.entryProgress,
        nextReady: ctx.waves.nextReady, retainedPlans: ctx.waves.retainedPlans, enemies: ctx.prepared?.enemies.activeCount ?? 0,
        meteors: ctx.prepared?.meteors.activeCount ?? 0, omittedMeteors: ctx.prepared?.meteors.omitted ?? 0,
        waitingForEnemyPool: ctx.waves.waitingForEnemyPool }) : undefined,
      enemies: Object.freeze((ctx.prepared?.enemies.staged ?? []).filter((e) => e.active && e.spawn).map((e) => Object.freeze({
        id: e.base.id, x: e.x, z: e.z, rotY: e.rotY, class: e.spawn?.class ?? 'Warrior', boss: e.boss }))),
      meteors: Object.freeze((ctx.prepared?.meteors.staged ?? []).filter((m) => m.active && m.spawn).map((m) => Object.freeze({ id: m.spawn?.id ?? '', x: m.x, z: m.z, size: m.spawn?.size ?? 'S' }))),
      hostileShots: Object.freeze((ctx.prepared?.enemies.bolts ?? []).filter((b) => b.active).map((b) => Object.freeze({ id: b.id, x: b.x, z: b.z }))),
      tick: this._tick, paused: this._paused,
      player: Object.freeze({ ...ctx.player.pose }),
      summary: Object.freeze({ ENE: s.ENE, SHD: s.SHD, DEF: s.DEF, MIT: s.MIT, SPD: s.SPD,
        S_D: s.S_D, S_R: s.S_R, REG: s.REG, LVL: s.LVL, HP: s.HP, integrityMax: s.integrity_max,
        eneMax: BALANCE.sheet.playerDefaults.ENE_max, shdMax: BALANCE.sheet.playerDefaults.SHD_max, integrityState: s.integrityState }),
      shots: Object.freeze(ctx.shots.activeShots.map((shot) => Object.freeze({ id: shot.id, x: shot.x, z: shot.z, radius: shot.radius, weapon: shot.weapon }))),
      activeWeapon: ctx.firing.activeWeapon,
      crafting: ctx.crafting.job ? { name: ctx.crafting.job.recipe.label, progress: (1 - ctx.crafting.job.remaining / ctx.crafting.job.recipe.duration) * 100 } : undefined,
      weaponLevel: ctx.firing.level, bombCharges: ctx.firing.bombCharges,
      drops: Object.freeze(ctx.drops.entities.filter((d) => d.active).map((d) => Object.freeze({ id: d.id, x: d.x, z: d.z }))),
      areaAttack: ctx.firing.areaAttack.active ? Object.freeze({ ...ctx.firing.areaAttack }) : undefined,
      elapsedSec: ctx.results.elapsedSec, kills: ctx.results.kills, score: ctx.results.score,
    })
  }
}
