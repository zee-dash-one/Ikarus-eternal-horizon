import type { ResolvedSector, SectorCatalog } from '../core/run-plan.ts'
import { freezeData, requirePreparation } from '../core/seeded-random.ts'

export class SectorManager {
  readonly catalog: SectorCatalog
  constructor(catalog: SectorCatalog) {
    this.catalog = freezeData(structuredClone(catalog))
    const { archetypes, factions, sectors } = this.catalog
    for (const rows of [archetypes, factions, sectors]) {
      requirePreparation(rows.length > 0 && rows.length <= 128 && rows.every((row) => row.id.length > 0) && new Set(rows.map((row) => row.id)).size === rows.length, 'IDs do catálogo vazios/repetidos ou catálogo excedido')
    }
    for (const archetype of archetypes) {
      requirePreparation(['Tanker', 'Warrior', 'Rogue', 'Special'].includes(archetype.class) && ['Maldroids', 'Hollows', 'Orcs', 'Prismari'].includes(archetype.race) && ['drone', 'mini_boss'].includes(archetype.rank), `arquétipo inválido: ${archetype.id}`)
      const owner = factions.find((row) => row.id === archetype.factionId)
      requirePreparation(owner?.archetypeIds.includes(archetype.id), `arquétipo sem facção válida: ${archetype.id}`)
    }
    for (const faction of factions) {
      requirePreparation(faction.archetypeIds.length > 0 && new Set(faction.archetypeIds).size === faction.archetypeIds.length, `lista inválida: ${faction.id}`)
      for (const id of faction.archetypeIds) requirePreparation(archetypes.some((row) => row.id === id && row.factionId === faction.id), `arquétipo fora da facção: ${id}`)
    }
    for (const sector of sectors) {
      requirePreparation(sector.factionIds.length > 0 && new Set(sector.factionIds).size === sector.factionIds.length && sector.factionIds.every((id) => factions.some((row) => row.id === id)), `facções inválidas: ${sector.id}`)
      requirePreparation(sector.formations.length > 0 && new Set(sector.formations).size === sector.formations.length && sector.formations.every((id) => ['V', 'Circle', 'LineDivers'].includes(id)), `formações inválidas: ${sector.id}`)
      requirePreparation(sector.asteroidMix.length > 0 && new Set(sector.asteroidMix.map((row) => row.size)).size === sector.asteroidMix.length && sector.asteroidMix.every((row) => ['S', 'M', 'L'].includes(row.size) && Number.isFinite(row.weight) && row.weight > 0), `mix inválido: ${sector.id}`)
      requirePreparation(Number.isFinite(sector.asteroidMix.reduce((sum, row) => sum + row.weight, 0)), `pesos excedidos: ${sector.id}`)
      this.resolve(sector.id)
    }
  }
  resolve(id: string): ResolvedSector {
    const sector = this.catalog.sectors.find((row) => row.id === id)
    requirePreparation(sector, `setor desconhecido: ${id}`)
    const allowed = this.catalog.archetypes.filter((row) => sector.factionIds.includes(row.factionId))
    const drones = allowed.filter((row) => row.rank === 'drone' && row.class !== 'Special')
    const miniboss = allowed.find((row) => row.id === sector.minibossId && row.rank === 'mini_boss' && row.class === 'Special')
    requirePreparation(drones.length > 0 && miniboss, `setor sem drones/miniboss legal: ${id}`)
    return freezeData({ sector, drones, miniboss })
  }
}
