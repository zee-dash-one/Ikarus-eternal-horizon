import type { PlayfieldPoint } from './playfield.ts'

export const WAVES_PER_SPRINT = 50
export const RUN_CONTENT_VERSION = 'poc3-4'
export type EnemyClass = 'Tanker' | 'Warrior' | 'Rogue' | 'Special'
export type Formation = 'V' | 'Circle' | 'LineDivers'
export type MeteorSize = 'S' | 'M' | 'L'
export interface Rect { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number }
export interface SpawnPoint {
  readonly id: string
  readonly position: PlayfieldPoint
  readonly halfExtents: PlayfieldPoint
  readonly direction: PlayfieldPoint
  readonly capacity: number
}
export interface EnemyArchetype {
  readonly id: string
  readonly factionId: string
  readonly race: 'Maldroids' | 'Hollows' | 'Orcs' | 'Prismari'
  readonly class: EnemyClass
  readonly rank: 'drone' | 'mini_boss'
}
export interface Faction { readonly id: string; readonly archetypeIds: readonly string[] }
export interface Sector {
  readonly id: string
  readonly factionIds: readonly string[]
  readonly formations: readonly Formation[]
  readonly minibossId: string
  readonly asteroidMix: readonly { readonly size: MeteorSize; readonly weight: number }[]
}
export interface SectorCatalog {
  readonly archetypes: readonly EnemyArchetype[]
  readonly factions: readonly Faction[]
  readonly sectors: readonly Sector[]
}
export interface ResolvedSector { readonly sector: Sector; readonly drones: readonly EnemyArchetype[]; readonly miniboss: EnemyArchetype }
export interface EnemySpawn {
  readonly id: string
  readonly archetypeId: string
  readonly factionId: string
  readonly class: EnemyClass
  readonly squadId: string | null
  readonly formation: Formation | null
  readonly slot: number
  readonly spawnPointId: string
  readonly position: PlayfieldPoint
  readonly direction: PlayfieldPoint
  readonly offsetTicks: number
}
export interface WavePlan {
  readonly waveIndex: number
  readonly kind: 'regular' | 'miniboss'
  readonly cooldownTicks: number
  readonly completion: 'all-emitted-and-cleared' | 'miniboss-defeated-and-cleared'
  readonly enemies: readonly EnemySpawn[]
}
export interface AsteroidSpawnEvent {
  readonly id: string
  readonly tick: number
  readonly size: MeteorSize
  readonly spawnPointId: string
  readonly position: PlayfieldPoint
  readonly velocity: PlayfieldPoint
}
export interface AsteroidSegment { readonly index: number; readonly startTick: number; readonly endTick: number; readonly events: readonly AsteroidSpawnEvent[] }
export interface SprintPlan {
  readonly sprintIndex: number
  readonly sectorId: string
  readonly seed: string
  readonly contentVersion: string
  readonly balanceVersion: string
  readonly enemyBudget: number
  readonly asteroidBudget: number
  readonly asteroidIntervalTicks: number
  readonly waves: readonly WavePlan[]
  readonly asteroids: AsteroidSegment
}
export interface CooldownCurve { readonly baseSec: number; readonly minSec: number; readonly maxSec: number; readonly perSprintSec: number; readonly perWaveSec: number }
export interface RunPreparationBalance {
  readonly visuals: EncounterVisualBalance
  readonly version: string
  readonly safeEntry: Rect
  readonly spawnMargin: number
  readonly enemyPoints: readonly SpawnPoint[]
  readonly asteroidPoints: readonly SpawnPoint[]
  readonly catalog: SectorCatalog
  readonly sectorOrder: readonly string[]
  readonly enemy: { readonly budget: number; readonly prewarm: number; readonly minCount: number; readonly maxCount: number; readonly growthEveryWaves: number; readonly spacingTicks: number; readonly cooldown: CooldownCurve }
  readonly asteroid: { readonly budget: number; readonly firstBatch: number; readonly segmentTicks: number; readonly maxEventsPerSegment: number; readonly firstDelayTicks: number; readonly minSpeed: number; readonly maxSpeed: number; readonly lateralSpeed: number; readonly cooldown: CooldownCurve }
}
export interface EncounterVisualBalance {
  readonly enemySize: { readonly x: number; readonly y: number; readonly z: number }
  readonly enemyColors: Readonly<Record<EnemyClass, number>>
  readonly asteroidRadii: Readonly<Record<MeteorSize, number>>
  readonly asteroidColor: number
}
export type PreparationStep = 'enemy-points' | 'asteroid-points' | 'parallax' | 'sector' | 'sprint-plan' | 'first-encounter'
export interface PreparationProgress { readonly step: PreparationStep; readonly completed: number; readonly total: number }
export interface StagedEncounter {
  readonly enemies: readonly EnemySpawn[]
  readonly asteroids: readonly AsteroidSpawnEvent[]
}
/** Port implemented in View; Core never imports meshes or a renderer. */
export interface PreparedRunView {
  readonly layerCount: number
  warmup(encounter: StagedEncounter): void | Promise<void>
  dispose(): void
}
