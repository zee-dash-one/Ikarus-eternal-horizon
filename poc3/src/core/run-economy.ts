export type MaterialId = 'metalScrap' | 'prismaticCrystal' | 'denseCore' | 'darkMatter'
export type PrimaryWeapon = 'laser' | 'plasma' | 'beam' | 'mjolnir'
export type EquipmentStat = 'DEF' | 'SPD' | 'S_D' | 'S_R' | 'REG'
export interface RunRecipe {
  readonly id: string; readonly label: string; readonly materials: Partial<Record<MaterialId, number>>
  readonly energy: number; readonly duration: number; readonly minSprint: number
  readonly output: { readonly kind: 'repair' | 'shield' | 'weapon' | 'upgrade' | 'bomb' | 'equipment'; readonly amount: number; readonly id?: string }
}
export interface EquipmentDefinition { readonly id: string; readonly label: string; readonly grants: Partial<Record<EquipmentStat, number>> }
export const MATERIALS: readonly MaterialId[] = ['metalScrap', 'prismaticCrystal', 'denseCore', 'darkMatter']
export const MATERIAL_LABELS: Record<MaterialId, string> = { metalScrap: 'Sucata metálica', prismaticCrystal: 'Cristal prismático', denseCore: 'Núcleo denso', darkMatter: 'Matéria escura' }
export const DEFAULT_ECONOMY = {
  inventory: { metalScrap: 200, prismaticCrystal: 50, denseCore: 20, darkMatter: 10 },
  drops: { budget: 64, lifetime: 40, drift: 2, magnetRadius: 12, magnetSpeed: 18, collectRadius: 1.2, radius: 0.35, color: 0x38e8ae,
    enemyChance: 0.8, scrapMin: 1, scrapMax: 4, meteorScrap: 4, bossCrystal: 3, bossCore: 1, crystalChance: 0.15 },
  maxWeaponLevel: 5, damagePerLevel: 0.2, initialBombs: 3, maxBombs: 9,
  bomb: { damage: 250, radius: 35, energy: 20, cooldown: 1 },
  recipes: [
    { id: 'repair', label: 'Reparar integridade', materials: { metalScrap: 8 }, energy: 15, duration: 3, minSprint: 1, output: { kind: 'repair', amount: 35 } },
    { id: 'shield', label: 'Recarregar escudo', materials: { metalScrap: 6, prismaticCrystal: 1 }, energy: 15, duration: 3, minSprint: 1, output: { kind: 'shield', amount: 40 } },
    { id: 'plasma', label: 'Construir Plasma', materials: { metalScrap: 12, prismaticCrystal: 2 }, energy: 20, duration: 5, minSprint: 1, output: { kind: 'weapon', id: 'plasma', amount: 1 } },
    { id: 'beam', label: 'Construir Beam', materials: { metalScrap: 18, prismaticCrystal: 4 }, energy: 25, duration: 6, minSprint: 2, output: { kind: 'weapon', id: 'beam', amount: 1 } },
    { id: 'mjolnir', label: 'Construir Mjolnir', materials: { metalScrap: 20, denseCore: 1 }, energy: 30, duration: 8, minSprint: 2, output: { kind: 'weapon', id: 'mjolnir', amount: 1 } },
    { id: 'upgrade', label: 'Melhorar arma ativa', materials: { metalScrap: 15, prismaticCrystal: 2 }, energy: 20, duration: 5, minSprint: 1, output: { kind: 'upgrade', amount: 1 } },
    { id: 'nova', label: 'Construir carga Nova', materials: { metalScrap: 10, denseCore: 1 }, energy: 20, duration: 4, minSprint: 1, output: { kind: 'bomb', amount: 1 } },
    { id: 'panels', label: 'Construir painéis reativos', materials: { metalScrap: 12, prismaticCrystal: 2 }, energy: 20, duration: 5, minSprint: 1, output: { kind: 'equipment', id: 'reactive-panels', amount: 1 } },
    { id: 'engine', label: 'Construir motor auxiliar', materials: { metalScrap: 14, denseCore: 1 }, energy: 20, duration: 5, minSprint: 2, output: { kind: 'equipment', id: 'assist-engine', amount: 1 } },
  ] as readonly RunRecipe[],
  equipment: [
    { id: 'reactive-panels', label: 'Painéis reativos', grants: { DEF: 5 } },
    { id: 'assist-engine', label: 'Motor auxiliar', grants: { SPD: 2, REG: 2 } },
  ] as readonly EquipmentDefinition[],
  profiles: {
    plasma: { damage: 80, energy: 4, rate: 2, speed: 18, lifetime: 4, radius: 0.7, area: 5, color: 0x71aaff },
    beam: { damage: 90, energy: 10, width: 1.3, range: 55, color: 0x79ffff },
    mjolnir: { damage: 55, energy: 8, rate: 1.5, range: 30, halfAngle: 0.65, color: 0xdba4ff },
  },
}
export interface LabSnapshot {
  readonly survivor: boolean
  readonly stock: Readonly<Record<MaterialId, number>>
  readonly sprint: number; readonly weapon: PrimaryWeapon; readonly weapons: readonly PrimaryWeapon[]
  readonly level: number; readonly bombs: number; readonly equipment: readonly string[]
  readonly job: { readonly id: string; readonly remaining: number } | null
  readonly error: string | null
}
export type EconomyBalance = typeof DEFAULT_ECONOMY
