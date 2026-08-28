import type { IntegrityState } from './sheet/char-sheet.ts'

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
  readonly tick: number
  readonly paused: boolean
  readonly player: PlayerPose
  readonly summary: SummarySnapshot
  readonly elapsedSec: number
  readonly kills: number
  readonly score: number
}

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
