/**
 * SDD-D02 weapon catalog — L1 play-start rows plus identity (color, pool, burst).
 * Level curves live in weapon-levels.ts. Do not import BALANCE (cycle); A01 re-exports both.
 */

import {
  BEAM_LEVELS,
  LASER_LEVELS,
  MJOLNIR_LEVELS,
  PLASMA_LEVELS,
  type WeaponLevelRow,
} from './weapon-levels'

export type WeaponId = 'laser' | 'plasma' | 'beam' | 'mjolnir'

export type WeaponProfile = 'projectile' | 'orb' | 'beam' | 'cone'

export interface ProjectileSpec {
  speed: number
  radius: number
  lifetime: number
  damageDecayPerUnit: number
}

export interface OrbSpec {
  speed: number
  radius: number
  lifetime: number
  aoeRadius: number
  damageDecayPerUnit: number
}

export interface BeamSpec {
  width: number
  length: number
  ticksPerSec: number
  dps: number
  energyPerSec: number
}

export interface ConeSpec {
  angleDeg: number
  length: number
  ticksPerSec: number
  dps: number
  energyPerSec: number
}

export interface LaserSpec {
  forwardShots: number
  diagonalShotsPerSide: number
  totalShots: number
  diagonalAngleDeg: number
  forwardSpread: number
  diagonalSpreadDeg: number
  /** Consecutive volleys (hold, no pause) before the barrel must cool. */
  burstShots: number
  /** Mandatory cool-down after a full burst (seconds). */
  overheatSec: number
}

export interface WeaponConfig {
  id: WeaponId
  displayName: string
  color: number
  rate: number
  energyPerShot: number
  damage: number
  profile: WeaponProfile
  poolSize: number
  muzzleOffset: { x: number; y: number; z: number }
  level?: number
  projectile?: ProjectileSpec
  orb?: OrbSpec
  beam?: BeamSpec
  cone?: ConeSpec
  laser?: LaserSpec
}

function levelOne(rows: readonly WeaponLevelRow[]): WeaponLevelRow {
  const row = rows[0]
  if (!row) {
    throw new Error('weapon level table missing L1')
  }
  return row
}

const LASER_L1 = levelOne(LASER_LEVELS)
const PLASMA_L1 = levelOne(PLASMA_LEVELS)
const BEAM_L1 = levelOne(BEAM_LEVELS)
const MJOLNIR_L1 = levelOne(MJOLNIR_LEVELS)

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  laser: {
    id: 'laser',
    displayName: 'Laser',
    color: 0x22d3ee,
    rate: LASER_L1.rate,
    energyPerShot: LASER_L1.energyPerShot,
    damage: LASER_L1.damage,
    profile: 'projectile',
    /** L12 volley 12 × burst 15 = 180; ~3s life overlaps ~4 cycles. */
    poolSize: 768,
    muzzleOffset: { x: 0, y: 0, z: -1.4 },
    level: 1,
    projectile: {
      speed: LASER_L1.speed,
      radius: LASER_L1.radius,
      lifetime: LASER_L1.lifetime,
      damageDecayPerUnit: LASER_L1.damageDecayPerUnit,
    },
    laser: {
      forwardShots: LASER_L1.forwardShots,
      diagonalShotsPerSide: LASER_L1.diagonalShotsPerSide,
      totalShots: LASER_L1.forwardShots + 2 * LASER_L1.diagonalShotsPerSide,
      diagonalAngleDeg: LASER_L1.diagonalAngleDeg,
      forwardSpread: LASER_L1.forwardSpread,
      diagonalSpreadDeg: 10,
      burstShots: 15,
      overheatSec: 0.5,
    },
  },
  plasma: {
    id: 'plasma',
    displayName: 'Plasma',
    color: 0xfb923c,
    rate: PLASMA_L1.rate,
    energyPerShot: PLASMA_L1.energyPerShot,
    damage: PLASMA_L1.damage,
    profile: 'orb',
    poolSize: 32,
    muzzleOffset: { x: 0, y: 0, z: -1.4 },
    orb: {
      speed: PLASMA_L1.speed,
      radius: PLASMA_L1.radius,
      lifetime: PLASMA_L1.lifetime,
      aoeRadius: PLASMA_L1.aoeRadius,
      damageDecayPerUnit: PLASMA_L1.damageDecayPerUnit,
    },
  },
  beam: {
    id: 'beam',
    displayName: 'Beam',
    color: 0xa78bfa,
    rate: 1,
    energyPerShot: 0,
    damage: 0,
    profile: 'beam',
    poolSize: 4,
    muzzleOffset: { x: 0, y: 0, z: -1.4 },
    beam: {
      width: BEAM_L1.width,
      length: BEAM_L1.length,
      ticksPerSec: BEAM_L1.ticksPerSec,
      dps: BEAM_L1.dps,
      energyPerSec: BEAM_L1.energyPerSec,
    },
  },
  mjolnir: {
    id: 'mjolnir',
    displayName: 'Mjolnir',
    color: 0x34d399,
    rate: 1,
    energyPerShot: 0,
    damage: 0,
    profile: 'cone',
    poolSize: 4,
    muzzleOffset: { x: 0, y: 0, z: -1.4 },
    cone: {
      angleDeg: MJOLNIR_L1.angleDeg,
      length: MJOLNIR_L1.length,
      ticksPerSec: MJOLNIR_L1.ticksPerSec,
      dps: MJOLNIR_L1.dps,
      energyPerSec: MJOLNIR_L1.energyPerSec,
    },
  },
}

export function copyWeaponConfig(src: WeaponConfig): WeaponConfig {
  return {
    ...src,
    muzzleOffset: { ...src.muzzleOffset },
    projectile: src.projectile ? { ...src.projectile } : undefined,
    orb: src.orb ? { ...src.orb } : undefined,
    beam: src.beam ? { ...src.beam } : undefined,
    cone: src.cone ? { ...src.cone } : undefined,
    laser: src.laser ? { ...src.laser } : undefined,
  }
}
