import { BALANCE } from '../core/balancer.ts'
import type { AsteroidSegment, ResolvedSector, SprintPlan } from '../core/run-plan.ts'
import type { DomainEvent } from '../core/event.ts'
import { deriveSeed, requirePreparation, seededRandom } from '../core/seeded-random.ts'
import type { RunContext } from './run-context.ts'
import type { PreparedWorld } from './run-preparation-manager.ts'
import { SectorManager } from './sector-manager.ts'

export type CombatPhase = 'ENTERING' | 'ACTIVE' | 'TRANSITION'

/** Simulation schedules consume immutable plans; frame work builds the next plan. */
export class WaveManager {
  phase: CombatPhase = 'ENTERING'
  waveIndex = 0
  sprintTick = 0
  waitingForEnemyPool = false
  private _entryTick = 0
  private _waveTick = 0
  private _emitted = 0
  private _nextEmissionTick = 0
  private _cooldown: number | null = null
  private _bossDefeated = false
  private _plan: SprintPlan
  private _sector: ResolvedSector
  private _next: SprintPlan | null = null
  private _nextSector: ResolvedSector | null = null
  private _work: Generator<void, SprintPlan> | null = null
  private readonly _sectors: SectorManager
  private _segment: AsteroidSegment
  private _nextSegment: AsteroidSegment | null = null
  private _asteroidCursor = 0
  private _disposed = false
  private _random: () => number = () => 0.5
  constructor(private readonly _context: RunContext, world: PreparedWorld) {
    this._plan = world.plan; this._sector = world.sector; this._segment = world.plan.asteroids
    this._sectors = new SectorManager(world.planner.balance.catalog)
    this._context.player.setEntryProgress(0, BALANCE.combat.entryFromZ)
  }
  get plan(): SprintPlan { return this._plan }
  get sector(): ResolvedSector { return this._sector }
  get nextReady(): boolean { return this._next !== null }
  get retainedPlans(): number { return 1 + (this._next || this._work ? 1 : 0) }
  get entryProgress(): number { return Math.min(1, this._entryTick / BALANCE.combat.entryTicks) }
  get random(): () => number { return this._random }
  private get _world(): PreparedWorld { const world = this._context.prepared; requirePreparation(world, 'mundo descartado'); return world }
  private get _wave() { const wave = this._plan.waves[this.waveIndex]; requirePreparation(wave, 'wave ausente'); return wave }
  /** Called once per presentation frame. No entities activated, current plan untouched. */
  prepareFrame(): void {
    if (this._disposed || this._context.disposed || this.phase === 'ENTERING') return
    const planner = this._world.planner
    if (!this._next) {
      if (!this._work) {
        const index = this._plan.sprintIndex + 1, order = planner.balance.sectorOrder
        const sectorId = order[(index - 1) % order.length]; requirePreparation(sectorId, 'setor ausente')
        const sector = this._sectors.resolve(sectorId)
        this._nextSector = sector
        this._work = planner.prepare(this._context.results.metadata, index, sector)
      }
      for (let i = 0; i < BALANCE.combat.planningWavesPerFrame; i++) {
        const item = this._work.next()
        if (item.done) { this._next = item.value; this._work = null; break }
      }
    }
    if (!this._nextSegment) this._nextSegment = planner.asteroidSegment(this._plan.seed, this._plan.sprintIndex, this._sector, this._segment.index + 1)
  }
  /** Returns true only when ordinary gameplay may tick. Entry/transition are safe gates. */
  step(): boolean {
    if (this._disposed) return false
    const ctx = this._context, world = this._world
    if (this.phase === 'ENTERING') {
      ctx.player.setEntryProgress(++this._entryTick / BALANCE.combat.entryTicks, BALANCE.combat.entryFromZ)
      if (this._entryTick >= BALANCE.combat.entryTicks) {
        ctx.events.publish({ type: 'PlayerEntryCompleted' }); this._startSprint()
      }
      return false
    }
    if (this.phase === 'TRANSITION') {
      if (this._next) {
        // Atomic adoption: old timeline and remaining optional entities have been retired.
        this._plan = this._next; this._next = null
        requirePreparation(this._nextSector, 'setor seguinte ausente'); this._sector = this._nextSector; this._nextSector = null
        this._segment = this._plan.asteroids; this._nextSegment = null; this._asteroidCursor = 0
        this._startSprint()
      }
      return false
    }
    const wave = this._wave
    if (this._emitted === wave.enemies.length && world.enemies.activeCount === 0 && (wave.kind !== 'miniboss' || this._bossDefeated)) {
      if (wave.kind === 'miniboss') {
        this.phase = 'TRANSITION'; world.meteors.clear(); world.enemies.clear()
        for (const shot of [...ctx.shots.activeShots]) ctx.shots.release(shot)
        ctx.events.publish({ type: 'SprintTransition', sprintIndex: this._plan.sprintIndex }); return false
      }
      if (this._cooldown === null) this._cooldown = wave.cooldownTicks
      if (--this._cooldown <= 0) { this.waveIndex++; this._startWave() }
    }
    this.sprintTick++; this._waveTick++
    const current = this._wave
    const descriptor = current.enemies[this._emitted]
    this.waitingForEnemyPool = false
    if (descriptor && this._waveTick >= this._nextEmissionTick) {
      if (world.enemies.emit(descriptor, this._plan.sprintIndex, this.waveIndex, current.kind === 'miniboss')) {
        ctx.results.authorizeEntity(descriptor.id)
        this._emitted++
        const following = current.enemies[this._emitted]
        this._nextEmissionTick = this._waveTick + Math.max(1, following ? following.offsetTicks - descriptor.offsetTicks : 1)
      } else this.waitingForEnemyPool = true
    }
    this._emitAsteroid()
    return true
  }
  observe(events: readonly DomainEvent[]): void {
    const boss = this._plan.waves[49]?.enemies[0]?.id
    for (const e of events) if (e.type === 'enemy_destroyed' && e.kind === 'miniboss' && e.eventId === boss) this._bossDefeated = true
  }
  private _startSprint(): void {
    this.phase = 'ACTIVE'; this.waveIndex = 0; this.sprintTick = 0; this._bossDefeated = false
    this._context.events.publish({ type: 'SprintStarted', sprintIndex: this._plan.sprintIndex, sectorId: this._plan.sectorId })
    this._startWave()
  }
  private _startWave(): void {
    this._waveTick = 0; this._emitted = 0; this._cooldown = null
    const wave = this._wave
    this._nextEmissionTick = wave.enemies[0]?.offsetTicks ?? 0
    this._random = seededRandom(deriveSeed(this._plan.seed, 'ai', this.waveIndex))
    this._world.enemies.squads.start(wave)
    this._context.events.publish({ type: 'WaveStarted', sprintIndex: this._plan.sprintIndex, waveIndex: this.waveIndex, miniboss: wave.kind === 'miniboss' })
  }
  private _emitAsteroid(): void {
    const meteors = this._world.meteors
    if (this.sprintTick >= this._segment.endTick && this._nextSegment) {
      this._segment = this._nextSegment; this._nextSegment = null; this._asteroidCursor = 0
    }
    const events = this._segment.events
    // Late optional events are omitted, never drained as a burst after a stall.
    while ((events[this._asteroidCursor]?.tick ?? Infinity) < this.sprintTick - 1) { this._asteroidCursor++; meteors.omitted++ }
    const event = events[this._asteroidCursor]
    if (event && event.tick <= this.sprintTick) {
      if (meteors.emit(event)) this._context.results.authorizeEntity(event.id)
      this._asteroidCursor++
    }
  }
  dispose(): void { this._disposed = true; this._work?.return(this._plan); this._work = null; this._next = null; this._nextSegment = null }
}
