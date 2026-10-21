import type { RunPreparationBalance, SpawnPoint } from './run-plan.ts'

function point(id: string, x: number, capacity: number): SpawnPoint {
  return { id, position: { x, z: -180 }, halfExtents: { x: 12, z: 4 }, direction: { x: 0, z: 1 }, capacity }
}
/** Initial tuning, not additional lore. Classes are independent from faction identity. */
export const DEFAULT_RUN_PREPARATION: RunPreparationBalance = {
  visuals: { enemySize: { x: 1.5, y: 1, z: 2 }, enemyColors: { Tanker: 0xf97316, Warrior: 0xef4444, Rogue: 0xa78bfa, Special: 0xfde047 }, asteroidRadii: { S: 0.5, M: 1, L: 2 }, asteroidColor: 0x8794a8 },
  version: 'sprint-2', spawnMargin: 32,
  safeEntry: { minX: -12, maxX: 12, minZ: -20, maxZ: 30 },
  enemyPoints: [point('enemy-left', -100, 8), point('enemy-center', 0, 8), point('enemy-right', 100, 8)],
  asteroidPoints: [-18, 0, 18].map((x, i) => ({ ...point(['asteroid-left', 'asteroid-center', 'asteroid-right'][i] ?? '', x, 4), position: { x, z: -100 } })),
  sectorOrder: ['maldroid-frontier', 'hollow-belt'],
  catalog: {
    factions: [
      { id: 'maldroid-patrol', archetypeIds: ['maldroid-guard', 'maldroid-fighter', 'maldroid-scout', 'maldroid-warden'] },
      { id: 'hollow-patrol', archetypeIds: ['hollow-guard', 'hollow-fighter', 'hollow-scout', 'hollow-warden'] },
    ],
    archetypes: [
      { id: 'maldroid-guard', factionId: 'maldroid-patrol', race: 'Maldroids', class: 'Tanker', rank: 'drone' },
      { id: 'maldroid-fighter', factionId: 'maldroid-patrol', race: 'Maldroids', class: 'Warrior', rank: 'drone' },
      { id: 'maldroid-scout', factionId: 'maldroid-patrol', race: 'Maldroids', class: 'Rogue', rank: 'drone' },
      { id: 'maldroid-warden', factionId: 'maldroid-patrol', race: 'Maldroids', class: 'Special', rank: 'mini_boss' },
      { id: 'hollow-guard', factionId: 'hollow-patrol', race: 'Hollows', class: 'Tanker', rank: 'drone' },
      { id: 'hollow-fighter', factionId: 'hollow-patrol', race: 'Hollows', class: 'Warrior', rank: 'drone' },
      { id: 'hollow-scout', factionId: 'hollow-patrol', race: 'Hollows', class: 'Rogue', rank: 'drone' },
      { id: 'hollow-warden', factionId: 'hollow-patrol', race: 'Hollows', class: 'Special', rank: 'mini_boss' },
    ],
    sectors: [
      { id: 'maldroid-frontier', factionIds: ['maldroid-patrol'], formations: ['V', 'LineDivers', 'Circle'], minibossId: 'maldroid-warden', asteroidMix: [{ size: 'S', weight: 6 }, { size: 'M', weight: 3 }, { size: 'L', weight: 1 }] },
      { id: 'hollow-belt', factionIds: ['hollow-patrol'], formations: ['V', 'Circle'], minibossId: 'hollow-warden', asteroidMix: [{ size: 'S', weight: 3 }, { size: 'M', weight: 5 }, { size: 'L', weight: 2 }] },
    ],
  },
  enemy: { budget: 24, prewarm: 8, minCount: 3, maxCount: 8, growthEveryWaves: 10, spacingTicks: 12,
    cooldown: { baseSec: 2.5, minSec: 0.75, maxSec: 3, perSprintSec: 0.1, perWaveSec: 0.02 } },
  asteroid: { budget: 16, firstBatch: 3, segmentTicks: 1800, maxEventsPerSegment: 128, firstDelayTicks: 60, minSpeed: 6, maxSpeed: 12, lateralSpeed: 2,
    cooldown: { baseSec: 1.8, minSec: 0.45, maxSec: 2.5, perSprintSec: 0.05, perWaveSec: 0 } },
}
