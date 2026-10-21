import { describe, expect, it } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import { SectorManager } from './sector-manager.ts'

describe('SectorManager', () => {
  it('resolves sector-local drones/classes and a legal miniboss from a frozen catalog', () => {
    const manager = new SectorManager(BALANCE.preparation.catalog)
    const sector = manager.resolve('maldroid-frontier')
    expect(sector.drones).toHaveLength(3)
    expect(new Set(sector.drones.map((row) => row.class)).size).toBe(3)
    expect(new Set(sector.drones.map((row) => row.factionId)).size).toBe(1)
    expect(sector.miniboss).toMatchObject({ rank: 'mini_boss', class: 'Special', factionId: 'maldroid-patrol' })
    expect(Object.isFrozen(sector.sector.asteroidMix)).toBe(true)
  })
  it.each(['unknown-faction', 'foreign-miniboss', 'duplicate-id', 'bad-weight', 'unknown-archetype', 'no-drones'])('rejects catalog corruption: %s', (kind) => {
    const catalog = structuredClone(BALANCE.preparation.catalog)
    const sector = catalog.sectors[0], faction = catalog.factions[0], archetype = catalog.archetypes[0]
    if (!sector || !faction || !archetype) throw new Error('Missing fixture')
    if (kind === 'unknown-faction') Reflect.set(sector, 'factionIds', ['missing'])
    if (kind === 'foreign-miniboss') Reflect.set(sector, 'minibossId', 'hollow-warden')
    if (kind === 'duplicate-id') Reflect.set(catalog, 'archetypes', [...catalog.archetypes, archetype])
    if (kind === 'bad-weight') Reflect.set(sector, 'asteroidMix', [{ size: 'L', weight: -1 }])
    if (kind === 'unknown-archetype') Reflect.set(faction, 'archetypeIds', ['missing'])
    if (kind === 'no-drones') for (const row of catalog.archetypes.filter((a) => a.factionId === faction.id)) Reflect.set(row, 'class', 'Special')
    expect(() => new SectorManager(catalog)).toThrow(/Preparação inválida/)
  })
})
