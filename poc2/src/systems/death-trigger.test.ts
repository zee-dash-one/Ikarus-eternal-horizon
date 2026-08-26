import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../core/balancer'
import { Layer } from './layers'
import {
  DeathTrigger,
  SilentExplosionVfx,
  deathCauseId,
  deathCauseLabel,
  isPlayerKillCredit,
  type DeathCorpsePort,
  type DeathEventLike,
} from './death-trigger'
import type { DamageOutcome, DamageSink } from './damage-resolver'

function makeSink(layer: Layer, x = 0, z = 0): DamageSink & {
  layer: Layer
  x: number
  z: number
} {
  return {
    layer,
    x,
    z,
    applyDamage(): DamageOutcome {
      return {
        absorbedByShield: 0,
        dealtToHull: 0,
        shieldBroke: false,
        hullLevelChanged: false,
        destroyed: false,
        killed: false,
      }
    },
  }
}

function makePorts() {
  const sound = { playExplosionCue: vi.fn() }
  const vfx = new SilentExplosionVfx()
  const begun: DamageSink[] = []
  const erased: DamageSink[] = []
  const corpses: DeathCorpsePort = {
    begin(sink) {
      begun.push(sink)
    },
    erase(sink) {
      erased.push(sink)
    },
  }
  return { sound, vfx, corpses, begun, erased }
}

function killEvent(sink: DamageSink, source: Layer): DeathEventLike {
  return { kind: 'killed', sink, source }
}

describe('deathCauseId', () => {
  it('maps player shot/ram, enemy shot/ram, meteor and friendly fire', () => {
    expect(deathCauseId(Layer.Enemy, Layer.PlayerShot)).toBe('player-shot')
    expect(deathCauseLabel('player-shot')).toBe('player laser')
    expect(deathCauseId(Layer.Enemy, Layer.Player)).toBe('player-ram')
    expect(deathCauseLabel('player-ram')).toBe('player ram')
    expect(deathCauseId(Layer.Enemy, Layer.Meteor)).toBe('meteor')
    expect(deathCauseLabel('meteor')).toBe('asteroid')
    expect(deathCauseId(Layer.Player, Layer.EnemyShot)).toBe('enemy-shot')
    expect(deathCauseId(Layer.Player, Layer.Enemy)).toBe('enemy-ram')
    expect(deathCauseId(Layer.Enemy, Layer.EnemyShot)).toBe('friendly-shot')
    expect(deathCauseLabel('friendly-shot')).toBe('friendly fire')
    expect(isPlayerKillCredit(Layer.PlayerShot)).toBe(true)
    expect(isPlayerKillCredit(Layer.Player)).toBe(true)
    expect(isPlayerKillCredit(Layer.Meteor)).toBe(false)
  })
})

describe('DeathTrigger', () => {
  it('starts at zero kills and zero score', () => {
    const { sound, vfx, corpses } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    expect(death.kills).toBe(0)
    expect(death.score).toBe(0)
    expect(death.killLog).toHaveLength(0)
    death.dispose()
  })

  it('enemy killed by player shot plays explosion cue and vfx, logs, scores', () => {
    const { sound, vfx, corpses, begun } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    const enemy = makeSink(Layer.Enemy, 3, -8)
    death.handle(killEvent(enemy, Layer.PlayerShot))
    expect(sound.playExplosionCue).toHaveBeenCalledTimes(1)
    expect(vfx.lastCount).toBe(1)
    expect(vfx.lastX).toBe(3)
    expect(vfx.lastZ).toBe(-8)
    expect(begun).toEqual([enemy])
    expect(death.kills).toBe(1)
    expect(death.score).toBe(BALANCE.score.enemy)
    expect(death.killLog[0]).toMatchObject({
      cause: 'player-shot',
      causeLabel: 'player laser',
      source: Layer.PlayerShot,
      scoreAwarded: BALANCE.score.enemy,
    })
    death.dispose()
  })

  it('enemy killed by player ram scores and logs player ram', () => {
    const { sound, vfx, corpses } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    death.handle(killEvent(makeSink(Layer.Enemy), Layer.Player))
    expect(death.score).toBe(BALANCE.score.enemy)
    expect(death.killLog[0]?.cause).toBe('player-ram')
    expect(death.killLog[0]?.causeLabel).toBe('player ram')
    death.dispose()
  })

  it('enemy killed by meteor logs asteroid with zero score', () => {
    const { sound, vfx, corpses } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    death.handle(killEvent(makeSink(Layer.Enemy), Layer.Meteor))
    expect(death.kills).toBe(1)
    expect(death.score).toBe(0)
    expect(death.killLog[0]).toMatchObject({
      cause: 'meteor',
      causeLabel: 'asteroid',
      scoreAwarded: 0,
    })
    death.dispose()
  })

  it('player destroyed plays explosion and does not increment kills or score', () => {
    const { sound, vfx, corpses, begun } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    const ship = makeSink(Layer.Player, 1, 2)
    death.handle({ kind: 'destroyed', sink: ship, source: Layer.EnemyShot })
    expect(sound.playExplosionCue).toHaveBeenCalledTimes(1)
    expect(vfx.lastCount).toBe(1)
    expect(begun).toEqual([ship])
    expect(death.kills).toBe(0)
    expect(death.score).toBe(0)
    expect(death.killLog).toHaveLength(0)
    death.dispose()
  })

  it('erases the corpse after BALANCE.vfx.corpseMs', () => {
    const { sound, vfx, corpses, erased } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    const enemy = makeSink(Layer.Enemy)
    death.handle(killEvent(enemy, Layer.PlayerShot))
    death.update((BALANCE.vfx.corpseMs - 1) / 1000)
    expect(erased).toHaveLength(0)
    death.update(0.002)
    expect(erased).toEqual([enemy])
    death.dispose()
  })

  it('ignores a second handle on the same dying sink', () => {
    const { sound, vfx, corpses } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    const enemy = makeSink(Layer.Enemy)
    death.handle(killEvent(enemy, Layer.PlayerShot))
    death.handle(killEvent(enemy, Layer.PlayerShot))
    expect(sound.playExplosionCue).toHaveBeenCalledTimes(1)
    expect(death.kills).toBe(1)
    expect(death.score).toBe(BALANCE.score.enemy)
    death.dispose()
  })

  it('update allocates no objects', () => {
    const { sound, vfx, corpses } = makePorts()
    const death = new DeathTrigger({ sound, vfx, corpses })
    death.handle(killEvent(makeSink(Layer.Enemy), Layer.PlayerShot))
    const objectSpy = vi.spyOn(globalThis, 'Object')
    const arraySpy = vi.spyOn(globalThis, 'Array')
    death.update(0.016)
    expect(objectSpy).not.toHaveBeenCalled()
    expect(arraySpy).not.toHaveBeenCalled()
    objectSpy.mockRestore()
    arraySpy.mockRestore()
    death.dispose()
  })
})
