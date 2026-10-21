import type { IntegrityState } from './sheet/char-sheet.ts'
import type { EnemyClass, MeteorSize } from './run-plan.ts'

export interface PlayerPose {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly rotY: number
  readonly bank: number
  readonly dashing: boolean
}

export interface SummarySnapshot {
  readonly ENE: number
  readonly SHD: number
  readonly DEF: number
  readonly MIT: number
  readonly SPD: number
  readonly S_D: number
  readonly S_R: number
  readonly REG: number
  readonly LVL: number
  readonly HP: number
  readonly integrityMax: number
  readonly eneMax: number
  readonly shdMax: number
  readonly integrityState: IntegrityState
}

export interface WorldSnapshot {
  readonly crafting?: { readonly name: string; readonly progress: number }
  readonly weaponLevel?: number
  readonly bombCharges?: number
  readonly drops?: readonly ShotSnapshot[]
  readonly areaAttack?: { readonly kind: 'beam' | 'mjolnir' | 'nova'; readonly x: number; readonly z: number; readonly damage: number }

  readonly encounter?: EncounterSnapshot
  readonly enemies?: readonly { readonly id: string; readonly x: number; readonly z: number; readonly rotY: number; readonly class: EnemyClass; readonly boss: boolean }[]
  readonly meteors?: readonly { readonly id: string; readonly x: number; readonly z: number; readonly size: MeteorSize }[]
  readonly hostileShots?: readonly ShotSnapshot[]
  readonly shots?: readonly ShotSnapshot[]
  readonly activeWeapon?: string
  readonly tick: number
  readonly paused: boolean
  readonly player: PlayerPose
  readonly summary: SummarySnapshot
  readonly elapsedSec: number
  readonly kills: number
  readonly score: number
}

export interface EncounterSnapshot {
  readonly phase: 'ENTERING' | 'ACTIVE' | 'TRANSITION'
  readonly sprint: number; readonly wave: number; readonly sector: string
  readonly entryProgress: number; readonly nextReady: boolean; readonly retainedPlans: number
  readonly enemies: number; readonly meteors: number; readonly omittedMeteors: number; readonly waitingForEnemyPool: boolean
}

export interface ShotSnapshot { readonly id: number; readonly x: number; readonly z: number; readonly radius?: number; readonly weapon?: string }

export function createEmptyWorldSnapshot(): WorldSnapshot {
  return {
    tick: 0,
    paused: false,
    player: { x: 0, y: 0, z: 0, rotY: 0, bank: 0, dashing: false },
    summary: {
      ENE: 100,
      SHD: 100,
      DEF: 10,
      MIT: 1,
      SPD: 10,
      S_D: 10,
      S_R: 10,
      REG: 5,
      LVL: 1,
      HP: 100,
      integrityMax: 100,
      eneMax: 100,
      shdMax: 100,
      integrityState: 'LIGHT',
    },
    elapsedSec: 0,
    kills: 0,
    score: 0,
  }
}
