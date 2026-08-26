/**
 * SDD-D02 unified L1–L12 presets for all four weapons.
 * Tables live here to avoid an import cycle; BALANCE.weapons.levels points at them (RUL-12).
 */

import type { WeaponConfig, WeaponId, WeaponProfile } from './catalog'

export const WEAPON_LEVEL_COUNT = 12

export interface WeaponLevelRow {
  readonly level: number
  readonly damage: number
  readonly rate: number
  readonly energyPerShot: number
  readonly speed: number
  readonly radius: number
  readonly lifetime: number
  readonly damageDecayPerUnit: number
  readonly aoeRadius: number
  readonly aoeDuration: number
  readonly explosionFoci: number
  readonly forwardShots: number
  readonly diagonalShotsPerSide: number
  readonly diagonalAngleDeg: number
  readonly forwardSpread: number
  readonly width: number
  readonly length: number
  readonly angleDeg: number
  readonly ticksPerSec: number
  readonly dps: number
  readonly energyPerSec: number
}

/** @deprecated use WeaponLevelRow */
export type LaserLevel = WeaponLevelRow

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function scaleRow(
  level: number,
  from: Omit<WeaponLevelRow, 'level'>,
  to: Omit<WeaponLevelRow, 'level'>,
): WeaponLevelRow {
  const t = (level - 1) / (WEAPON_LEVEL_COUNT - 1)
  const out: Record<keyof Omit<WeaponLevelRow, 'level'>, number> = {
    damage: 0,
    rate: 0,
    energyPerShot: 0,
    speed: 0,
    radius: 0,
    lifetime: 0,
    damageDecayPerUnit: 0,
    aoeRadius: 0,
    aoeDuration: 0,
    explosionFoci: 0,
    forwardShots: 0,
    diagonalShotsPerSide: 0,
    diagonalAngleDeg: 0,
    forwardSpread: 0,
    width: 0,
    length: 0,
    angleDeg: 0,
    ticksPerSec: 0,
    dps: 0,
    energyPerSec: 0,
  }
  for (const key of Object.keys(out) as (keyof typeof out)[]) {
    out[key] = round2(lerp(from[key], to[key], t))
  }
  return { level, ...out }
}

export const LASER_LEVELS: readonly WeaponLevelRow[] = [
  { level: 1, damage: 40, rate: 10, energyPerShot: 0.25, speed: 30, radius: 0.12, lifetime: 2, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 1, diagonalShotsPerSide: 0, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 2, damage: 40, rate: 10, energyPerShot: 0.25, speed: 30, radius: 0.12, lifetime: 2, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 2, diagonalShotsPerSide: 0, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 3, damage: 40, rate: 10, energyPerShot: 0.25, speed: 30, radius: 0.12, lifetime: 2, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 3, diagonalShotsPerSide: 0, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 4, damage: 40, rate: 10, energyPerShot: 0.25, speed: 30, radius: 0.12, lifetime: 2, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 4, diagonalShotsPerSide: 0, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 5, damage: 50, rate: 11, energyPerShot: 0.5, speed: 30, radius: 0.12, lifetime: 2.5, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 3, diagonalShotsPerSide: 1, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 6, damage: 50, rate: 11, energyPerShot: 0.5, speed: 30, radius: 0.12, lifetime: 2.5, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 4, diagonalShotsPerSide: 1, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 7, damage: 50, rate: 11, energyPerShot: 0.5, speed: 30, radius: 0.12, lifetime: 2.5, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 3, diagonalShotsPerSide: 2, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 8, damage: 50, rate: 11, energyPerShot: 0.5, speed: 30, radius: 0.12, lifetime: 2.5, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 4, diagonalShotsPerSide: 2, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 9, damage: 60, rate: 12, energyPerShot: 1, speed: 30, radius: 0.12, lifetime: 3, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 3, diagonalShotsPerSide: 3, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 10, damage: 60, rate: 12, energyPerShot: 1, speed: 30, radius: 0.12, lifetime: 3, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 4, diagonalShotsPerSide: 3, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 11, damage: 60, rate: 12, energyPerShot: 1, speed: 30, radius: 0.12, lifetime: 3, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 3, diagonalShotsPerSide: 4, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 12, damage: 60, rate: 12, energyPerShot: 1, speed: 30, radius: 0.12, lifetime: 3, damageDecayPerUnit: 0, aoeRadius: 0, aoeDuration: 0, explosionFoci: 0, forwardShots: 4, diagonalShotsPerSide: 4, diagonalAngleDeg: 15, forwardSpread: 0.55, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
]

/**
 * Plasma L1–L12. Slower, costlier, harder hit than laser. No distance decay.
 * Explosion foci: 1 (L1–4) / 3 (L5–8) / 5 (L9–12). Each orb detonates on impact.
 */
export const PLASMA_LEVELS: readonly WeaponLevelRow[] = [
  { level: 1, damage: 80, rate: 2, energyPerShot: 8, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 2, aoeDuration: 0.3, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 2, damage: 80, rate: 2, energyPerShot: 8, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 2, aoeDuration: 0.3, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 3, damage: 80, rate: 2, energyPerShot: 8, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 2, aoeDuration: 0.3, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 4, damage: 80, rate: 2, energyPerShot: 8, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 2, aoeDuration: 0.3, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 5, damage: 120, rate: 2, energyPerShot: 12, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 4, aoeDuration: 0.5, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 6, damage: 120, rate: 2, energyPerShot: 12, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 4, aoeDuration: 0.5, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 7, damage: 120, rate: 2, energyPerShot: 12, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 4, aoeDuration: 0.5, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 8, damage: 120, rate: 2, energyPerShot: 12, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 4, aoeDuration: 0.5, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 9, damage: 180, rate: 2, energyPerShot: 18, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 6, aoeDuration: 0.8, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 10, damage: 180, rate: 2, energyPerShot: 18, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 6, aoeDuration: 0.8, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 11, damage: 180, rate: 2, energyPerShot: 18, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 6, aoeDuration: 0.8, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
  { level: 12, damage: 180, rate: 2, energyPerShot: 18, speed: 20, radius: 0.28, lifetime: 1.5, damageDecayPerUnit: 0, aoeRadius: 6, aoeDuration: 0.8, explosionFoci: 1, forwardShots: 0, diagonalShotsPerSide: 0, diagonalAngleDeg: 0, forwardSpread: 0, width: 0, length: 0, angleDeg: 0, ticksPerSec: 0, dps: 0, energyPerSec: 0 },
]

const BEAM_L1: Omit<WeaponLevelRow, 'level'> = {
  damage: 0,
  rate: 0,
  energyPerShot: 0,
  speed: 0,
  radius: 0,
  lifetime: 0,
  damageDecayPerUnit: 0,
  aoeRadius: 0,
  aoeDuration: 0,
  explosionFoci: 0,
  forwardShots: 0,
  diagonalShotsPerSide: 0,
  diagonalAngleDeg: 0,
  forwardSpread: 0,
  width: 0.35,
  length: 26,
  angleDeg: 0,
  ticksPerSec: 60,
  dps: 6,
  energyPerSec: 3,
}

const BEAM_L12: Omit<WeaponLevelRow, 'level'> = {
  damage: 0,
  rate: 0,
  energyPerShot: 0,
  speed: 0,
  radius: 0,
  lifetime: 0,
  damageDecayPerUnit: 0,
  aoeRadius: 0,
  aoeDuration: 0,
  explosionFoci: 0,
  forwardShots: 0,
  diagonalShotsPerSide: 0,
  diagonalAngleDeg: 0,
  forwardSpread: 0,
  width: 0.6,
  length: 35,
  angleDeg: 0,
  ticksPerSec: 60,
  dps: 12,
  energyPerSec: 5,
}

export const BEAM_LEVELS: readonly WeaponLevelRow[] = Array.from({ length: WEAPON_LEVEL_COUNT }, (_, i) =>
  scaleRow(i + 1, BEAM_L1, BEAM_L12),
)

const MJOLNIR_L1: Omit<WeaponLevelRow, 'level'> = {
  damage: 0,
  rate: 0,
  energyPerShot: 0,
  speed: 0,
  radius: 0,
  lifetime: 0,
  damageDecayPerUnit: 0,
  aoeRadius: 0,
  aoeDuration: 0,
  explosionFoci: 0,
  forwardShots: 0,
  diagonalShotsPerSide: 0,
  diagonalAngleDeg: 0,
  forwardSpread: 0,
  width: 0,
  length: 18,
  angleDeg: 50,
  ticksPerSec: 30,
  dps: 5,
  energyPerSec: 2.2,
}

const MJOLNIR_L12: Omit<WeaponLevelRow, 'level'> = {
  damage: 0,
  rate: 0,
  energyPerShot: 0,
  speed: 0,
  radius: 0,
  lifetime: 0,
  damageDecayPerUnit: 0,
  aoeRadius: 0,
  aoeDuration: 0,
  explosionFoci: 0,
  forwardShots: 0,
  diagonalShotsPerSide: 0,
  diagonalAngleDeg: 0,
  forwardSpread: 0,
  width: 0,
  length: 28,
  angleDeg: 75,
  ticksPerSec: 30,
  dps: 10,
  energyPerSec: 4,
}

export const MJOLNIR_LEVELS: readonly WeaponLevelRow[] = Array.from({ length: WEAPON_LEVEL_COUNT }, (_, i) =>
  scaleRow(i + 1, MJOLNIR_L1, MJOLNIR_L12),
)

const LEVELS_BY_ID: Record<WeaponId, readonly WeaponLevelRow[]> = {
  laser: LASER_LEVELS,
  plasma: PLASMA_LEVELS,
  beam: BEAM_LEVELS,
  mjolnir: MJOLNIR_LEVELS,
}

export type WeaponLevelSnapshotField =
  | Exclude<keyof WeaponLevelRow, 'level'>
  | 'burstShots'
  | 'overheatSec'

export type WeaponLevelSnapshot = Record<WeaponLevelSnapshotField, number>

const PROFILE_FIELDS: Record<WeaponProfile, readonly WeaponLevelSnapshotField[]> = {
  projectile: [
    'damage',
    'rate',
    'energyPerShot',
    'speed',
    'radius',
    'lifetime',
    'damageDecayPerUnit',
    'forwardShots',
    'diagonalShotsPerSide',
    'diagonalAngleDeg',
    'forwardSpread',
    'burstShots',
    'overheatSec',
  ],
  orb: [
    'damage',
    'rate',
    'energyPerShot',
    'speed',
    'radius',
    'lifetime',
    'damageDecayPerUnit',
    'aoeRadius',
    'aoeDuration',
    'explosionFoci',
    'forwardSpread',
  ],
  beam: ['width', 'length', 'ticksPerSec', 'dps', 'energyPerSec'],
  cone: ['angleDeg', 'length', 'ticksPerSec', 'dps', 'energyPerSec'],
}

export function levelsFor(id: WeaponId): readonly WeaponLevelRow[] {
  return LEVELS_BY_ID[id]
}

export function statFieldsForWeapon(id: WeaponId): readonly WeaponLevelSnapshotField[] {
  const profile = id === 'laser' ? 'projectile' : id === 'plasma' ? 'orb' : id === 'beam' ? 'beam' : 'cone'
  return PROFILE_FIELDS[profile]
}

export function weaponLevelSnapshot(cfg: WeaponConfig): WeaponLevelSnapshot {
  const laser = cfg.laser
  const projectile = cfg.projectile
  const orb = cfg.orb
  const beam = cfg.beam
  const cone = cfg.cone
  return {
    damage: cfg.damage,
    rate: cfg.rate,
    energyPerShot: cfg.energyPerShot,
    speed: projectile?.speed ?? orb?.speed ?? 0,
    radius: projectile?.radius ?? orb?.radius ?? 0,
    lifetime: projectile?.lifetime ?? orb?.lifetime ?? 0,
    damageDecayPerUnit: projectile?.damageDecayPerUnit ?? orb?.damageDecayPerUnit ?? 0,
    aoeRadius: orb?.aoeRadius ?? 0,
    aoeDuration: orb?.aoeDuration ?? 0,
    explosionFoci: orb?.explosionFoci ?? 0,
    forwardShots: laser?.forwardShots ?? 0,
    diagonalShotsPerSide: laser?.diagonalShotsPerSide ?? 0,
    diagonalAngleDeg: laser?.diagonalAngleDeg ?? 0,
    forwardSpread: laser?.forwardSpread ?? orb?.forwardSpread ?? 0,
    burstShots: laser?.burstShots ?? 0,
    overheatSec: laser?.overheatSec ?? 0,
    width: beam?.width ?? 0,
    length: beam?.length ?? cone?.length ?? 0,
    angleDeg: cone?.angleDeg ?? 0,
    ticksPerSec: beam?.ticksPerSec ?? cone?.ticksPerSec ?? 0,
    dps: beam?.dps ?? cone?.dps ?? 0,
    energyPerSec: beam?.energyPerSec ?? cone?.energyPerSec ?? 0,
  }
}

export function patchWeaponStat(cfg: WeaponConfig, field: WeaponLevelSnapshotField, value: number): void {
  switch (field) {
    case 'damage':
      cfg.damage = value
      return
    case 'rate':
      cfg.rate = value
      return
    case 'energyPerShot':
      cfg.energyPerShot = value
      return
    case 'speed':
      if (cfg.projectile) {
        cfg.projectile.speed = value
      }
      if (cfg.orb) {
        cfg.orb.speed = value
      }
      return
    case 'radius':
      if (cfg.projectile) {
        cfg.projectile.radius = value
      }
      if (cfg.orb) {
        cfg.orb.radius = value
      }
      return
    case 'lifetime':
      if (cfg.projectile) {
        cfg.projectile.lifetime = value
      }
      if (cfg.orb) {
        cfg.orb.lifetime = value
      }
      return
    case 'damageDecayPerUnit':
      if (cfg.projectile) {
        cfg.projectile.damageDecayPerUnit = value
      }
      if (cfg.orb) {
        cfg.orb.damageDecayPerUnit = value
      }
      return
    case 'aoeRadius':
      if (cfg.orb) {
        cfg.orb.aoeRadius = value
      }
      return
    case 'aoeDuration':
      if (cfg.orb) {
        cfg.orb.aoeDuration = value
      }
      return
    case 'explosionFoci':
      if (cfg.orb) {
        cfg.orb.explosionFoci = value
      }
      return
    case 'forwardSpread':
      if (cfg.laser) {
        cfg.laser.forwardSpread = value
      }
      if (cfg.orb) {
        cfg.orb.forwardSpread = value
      }
      return
    case 'forwardShots':
    case 'diagonalShotsPerSide':
    case 'diagonalAngleDeg':
    case 'burstShots':
    case 'overheatSec':
      if (cfg.laser) {
        cfg.laser[field] = value
        if (field === 'forwardShots' || field === 'diagonalShotsPerSide') {
          cfg.laser.totalShots = cfg.laser.forwardShots + 2 * cfg.laser.diagonalShotsPerSide
        }
      }
      return
    case 'width':
      if (cfg.beam) {
        cfg.beam.width = value
      }
      return
    case 'length':
      if (cfg.beam) {
        cfg.beam.length = value
      }
      if (cfg.cone) {
        cfg.cone.length = value
      }
      return
    case 'angleDeg':
      if (cfg.cone) {
        cfg.cone.angleDeg = value
      }
      return
    case 'ticksPerSec':
      if (cfg.beam) {
        cfg.beam.ticksPerSec = value
      }
      if (cfg.cone) {
        cfg.cone.ticksPerSec = value
      }
      return
    case 'dps':
      if (cfg.beam) {
        cfg.beam.dps = value
      }
      if (cfg.cone) {
        cfg.cone.dps = value
      }
      return
    case 'energyPerSec':
      if (cfg.beam) {
        cfg.beam.energyPerSec = value
      }
      if (cfg.cone) {
        cfg.cone.energyPerSec = value
      }
      return
  }
}

function applyLaserRow(cfg: WeaponConfig, row: WeaponLevelRow): void {
  if (!cfg.projectile || !cfg.laser) {
    return
  }
  cfg.level = row.level
  cfg.damage = row.damage
  cfg.rate = row.rate
  cfg.energyPerShot = row.energyPerShot
  cfg.projectile.speed = row.speed
  cfg.projectile.radius = row.radius
  cfg.projectile.lifetime = row.lifetime
  cfg.laser.forwardShots = row.forwardShots
  cfg.laser.diagonalShotsPerSide = row.diagonalShotsPerSide
  cfg.laser.totalShots = row.forwardShots + 2 * row.diagonalShotsPerSide
  cfg.laser.diagonalAngleDeg = row.diagonalAngleDeg
  cfg.laser.forwardSpread = row.forwardSpread
}

function applyPlasmaRow(cfg: WeaponConfig, row: WeaponLevelRow): void {
  if (!cfg.orb) {
    return
  }
  cfg.level = row.level
  cfg.damage = row.damage
  cfg.rate = row.rate
  cfg.energyPerShot = row.energyPerShot
  cfg.orb.speed = row.speed
  cfg.orb.radius = row.radius
  cfg.orb.lifetime = row.lifetime
  cfg.orb.damageDecayPerUnit = row.damageDecayPerUnit
  cfg.orb.aoeRadius = row.aoeRadius
  cfg.orb.aoeDuration = row.aoeDuration
  cfg.orb.explosionFoci = row.explosionFoci
  cfg.orb.forwardSpread = row.forwardSpread
}

function applyBeamRow(cfg: WeaponConfig, row: WeaponLevelRow): void {
  if (!cfg.beam) {
    return
  }
  cfg.level = row.level
  cfg.beam.width = row.width
  cfg.beam.length = row.length
  cfg.beam.ticksPerSec = row.ticksPerSec
  cfg.beam.dps = row.dps
  cfg.beam.energyPerSec = row.energyPerSec
}

function applyMjolnirRow(cfg: WeaponConfig, row: WeaponLevelRow): void {
  if (!cfg.cone) {
    return
  }
  cfg.level = row.level
  cfg.cone.angleDeg = row.angleDeg
  cfg.cone.length = row.length
  cfg.cone.ticksPerSec = row.ticksPerSec
  cfg.cone.dps = row.dps
  cfg.cone.energyPerSec = row.energyPerSec
}

export function applyWeaponLevel(cfg: WeaponConfig, level: number): void {
  const rows = levelsFor(cfg.id)
  const row = rows.find((entry) => entry.level === level)
  if (!row) {
    return
  }
  switch (cfg.profile) {
    case 'projectile':
      applyLaserRow(cfg, row)
      break
    case 'orb':
      applyPlasmaRow(cfg, row)
      break
    case 'beam':
      applyBeamRow(cfg, row)
      break
    case 'cone':
      applyMjolnirRow(cfg, row)
      break
  }
}

/** @deprecated use applyWeaponLevel */
export function applyLaserLevel(cfg: WeaponConfig, level: number): void {
  applyWeaponLevel(cfg, level)
}

export function applyPlasmaLevel(cfg: WeaponConfig, level: number): void {
  applyWeaponLevel(cfg, level)
}
