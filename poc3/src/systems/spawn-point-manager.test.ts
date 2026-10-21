import { describe, expect, it } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import { SpawnPointManager } from './spawn-point-manager.ts'

function registry() { return new SpawnPointManager(BALANCE.world, BALANCE.preparation.safeEntry, BALANCE.preparation.spawnMargin) }
describe('SpawnPointManager', () => {
  it('keeps independent immutable registries with stable IDs and capacities', () => {
    const manager = registry(), points = structuredClone(BALANCE.preparation.enemyPoints)
    manager.createEnemies(points)
    expect(manager.asteroids).toHaveLength(0)
    manager.createAsteroids(BALANCE.preparation.asteroidPoints)
    expect(manager.enemies).toHaveLength(3)
    expect(manager.asteroids).toHaveLength(3)
    expect(manager.enemy('enemy-left').capacity).toBe(8)
    expect(Object.isFrozen(manager.enemy('enemy-left').position)).toBe(true)
    expect(() => manager.enemy('asteroid-left')).toThrow(/desconhecido/)
    expect(() => manager.asteroid('enemy-left')).toThrow(/desconhecido/)
    expect(() => manager.createEnemies(points)).toThrow(/já criado/)
  })
  it.each([
    { label: 'entry overlap', patch: { position: { x: 0, z: 0 } } },
    { label: 'outside envelope', patch: { position: { x: 9999, z: -180 } } },
    { label: 'outward direction', patch: { direction: { x: 0, z: -1 } } },
    { label: 'nonunit direction', patch: { direction: { x: 0, z: 2 } } },
    { label: 'zero capacity', patch: { capacity: 0 } },
    { label: 'negative volume', patch: { halfExtents: { x: -1, z: 1 } } },
  ])('rejects $label before any run mounts', ({ patch }) => {
    const point = BALANCE.preparation.enemyPoints[0]
    if (!point) throw new Error('Missing fixture')
    expect(() => registry().createEnemies([{ ...point, ...patch }])).toThrow(/Preparação inválida/)
  })
  it('rejects duplicate IDs, including ambiguous cross-registry IDs', () => {
    const point = BALANCE.preparation.enemyPoints[0]
    if (!point) throw new Error('Missing fixture')
    expect(() => registry().createEnemies([point, point])).toThrow(/repetido/)
    const manager = registry(); manager.createEnemies([point])
    expect(() => manager.createAsteroids([point])).toThrow(/repetido/)
  })
})
