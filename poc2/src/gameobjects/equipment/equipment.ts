/**
 * Equips catalog — exclusive slots + stacking general mods.
 * Stamp source is D02 / DASH_LEVELS; BALANCE.equips re-exports this module (RUL-12).
 */

import type { DashLevel } from '../controller/dash-levels'
import { DASH_LEVELS, dashLevel } from '../controller/dash-levels'
import type { WeaponConfig, WeaponId } from '../weapon/catalog'
import { levelsFor, patchWeaponStat, type WeaponLevelRow } from '../weapon/weapon-levels'

export const EQUIP_SLOT_IDS = [
  'weapon',
  'dash',
  'bomb',
  'wings',
  'shield',
  'armor',
  'rockets',
  'engine',
  'collector',
  'converter',
  'lab',
] as const

export type EquipSlotId = (typeof EQUIP_SLOT_IDS)[number]

export type WeaponStampId = `${WeaponId}_lvl_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`
export type DashStampId = `dash_lvl_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`
export type GeneralModId = 'enemy_lvl_1_equip'
export type EquipId = string

export interface EquipSlots {
  weapon: EquipId | null
  dash: EquipId | null
  bomb: EquipId | null
  wings: EquipId | null
  shield: EquipId | null
  armor: EquipId | null
  rockets: EquipId | null
  engine: EquipId | null
  collector: EquipId | null
  converter: EquipId | null
  lab: EquipId | null
}

export interface EquipsState {
  slots: EquipSlots
  general: EquipId[]
}

export interface WeaponStampDef {
  readonly kind: 'weapon'
  readonly id: string
  readonly weaponId: WeaponId
  readonly level: number
}

export interface DashStampDef {
  readonly kind: 'dash'
  readonly id: string
  readonly level: number
}

export interface WeaponModDef {
  readonly kind: 'weaponMod'
  readonly id: GeneralModId
  readonly damage: number
  readonly rate: number
  readonly speed: number
  readonly radius: number
}

export interface WeaponModDeltas {
  readonly damage: number
  readonly rate: number
  readonly speed: number
  readonly radius: number
}

export interface ResolvedWeaponStats {
  readonly weaponId: WeaponId
  readonly level: number
  readonly damage: number
  readonly rate: number
  readonly speed: number
  readonly radius: number
  readonly energyPerShot: number
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

export interface ResolveEquipsResult {
  readonly weapon: ResolvedWeaponStats | null
  readonly dash: DashLevel | null
}

const WEAPON_IDS: readonly WeaponId[] = ['laser', 'plasma', 'beam', 'mjolnir']
const BOMB_IDS = ['pulseNova', 'swarmTorpedo', 'starKiller'] as const
const WING_IDS = ['standard', 'agility', 'armored'] as const
const FIT_IDS = ['light', 'standard', 'heavy'] as const
const COLLECTOR_IDS = ['passive', 'wide'] as const
const CONVERTER_IDS = ['scrap', 'crystal'] as const
const LEVEL_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

const WEAPON_STAMP_RE = /^(laser|plasma|beam|mjolnir)_lvl_(\d+)$/
const DASH_STAMP_RE = /^dash_lvl_(\d+)$/

function buildWeaponStampIds(): readonly string[] {
  const ids: string[] = []
  for (const weaponId of WEAPON_IDS) {
    for (const level of LEVEL_NUMS) {
      ids.push(`${weaponId}_lvl_${level}`)
    }
  }
  return ids
}

function buildDashStampIds(): readonly string[] {
  return LEVEL_NUMS.map((level) => `dash_lvl_${level}`)
}

export const WEAPON_STAMP_IDS: readonly string[] = buildWeaponStampIds()
export const DASH_STAMP_IDS: readonly string[] = buildDashStampIds()
export const GENERAL_MOD_IDS: readonly GeneralModId[] = ['enemy_lvl_1_equip']

export const ENEMY_LVL_1_EQUIP: WeaponModDef = {
  kind: 'weaponMod',
  id: 'enemy_lvl_1_equip',
  damage: 0,
  rate: 0,
  speed: 0,
  radius: 0,
}

export const EQUIP_MODS: Readonly<Record<GeneralModId, WeaponModDef>> = {
  enemy_lvl_1_equip: ENEMY_LVL_1_EQUIP,
}

const LEGAL_BY_SLOT: Record<EquipSlotId, readonly string[]> = {
  weapon: WEAPON_STAMP_IDS,
  dash: DASH_STAMP_IDS,
  bomb: BOMB_IDS,
  wings: WING_IDS,
  shield: FIT_IDS,
  armor: FIT_IDS,
  rockets: [],
  engine: [],
  collector: COLLECTOR_IDS,
  converter: CONVERTER_IDS,
  lab: [],
}

export function emptySlots(): EquipSlots {
  return {
    weapon: null,
    dash: null,
    bomb: null,
    wings: null,
    shield: null,
    armor: null,
    rockets: null,
    engine: null,
    collector: null,
    converter: null,
    lab: null,
  }
}

export function defaultPlayerEquips(): EquipsState {
  return {
    slots: {
      ...emptySlots(),
      weapon: 'laser_lvl_1',
      dash: 'dash_lvl_1',
      wings: 'standard',
      armor: 'standard',
    },
    general: [],
  }
}

export function defaultEnemyEquips(): EquipsState {
  return {
    slots: {
      ...emptySlots(),
      weapon: 'laser_lvl_1',
    },
    general: [],
  }
}

export function cloneEquips(src: EquipsState): EquipsState {
  return {
    slots: { ...src.slots },
    general: [...src.general],
  }
}

export function legalIdsForSlot(slot: EquipSlotId): readonly string[] {
  return LEGAL_BY_SLOT[slot]
}

export function isLegalForSlot(slot: EquipSlotId, id: EquipId | null): boolean {
  if (id === null) {
    return true
  }
  return LEGAL_BY_SLOT[slot].includes(id)
}

export function isGeneralMod(id: string): id is GeneralModId {
  return (GENERAL_MOD_IDS as readonly string[]).includes(id)
}

export function parseWeaponStamp(id: string | null | undefined): WeaponStampDef | null {
  if (!id) {
    return null
  }
  const match = WEAPON_STAMP_RE.exec(id)
  if (!match) {
    return null
  }
  const weaponId = match[1] as WeaponId
  const level = Number(match[2])
  if (!Number.isInteger(level) || level < 1 || level > 12) {
    return null
  }
  return { kind: 'weapon', id, weaponId, level }
}

export function parseDashStamp(id: string | null | undefined): DashStampDef | null {
  if (!id) {
    return null
  }
  const match = DASH_STAMP_RE.exec(id)
  if (!match) {
    return null
  }
  const level = Number(match[1])
  if (!Number.isInteger(level) || level < 1 || level > 12) {
    return null
  }
  return { kind: 'dash', id, level }
}

export function weaponStampId(weaponId: WeaponId, level: number): string {
  return `${weaponId}_lvl_${level}`
}

export function dashStampId(level: number): string {
  return `dash_lvl_${level}`
}

export function addWeaponMods(base: WeaponModDeltas, mods: readonly WeaponModDeltas[]): WeaponModDeltas {
  let damage = base.damage
  let rate = base.rate
  let speed = base.speed
  let radius = base.radius
  for (const mod of mods) {
    damage += mod.damage
    rate += mod.rate
    speed += mod.speed
    radius += mod.radius
  }
  return { damage, rate, speed, radius }
}

function modsFromGeneral(general: readonly EquipId[]): WeaponModDeltas[] {
  const out: WeaponModDeltas[] = []
  for (const id of general) {
    if (!isGeneralMod(id)) {
      continue
    }
    const def = EQUIP_MODS[id]
    out.push({ damage: def.damage, rate: def.rate, speed: def.speed, radius: def.radius })
  }
  return out
}

function snapshotFromRow(weaponId: WeaponId, row: WeaponLevelRow, mods: WeaponModDeltas): ResolvedWeaponStats {
  return {
    weaponId,
    level: row.level,
    damage: mods.damage,
    rate: mods.rate,
    speed: mods.speed,
    radius: mods.radius,
    energyPerShot: row.energyPerShot,
    lifetime: row.lifetime,
    damageDecayPerUnit: row.damageDecayPerUnit,
    aoeRadius: row.aoeRadius,
    aoeDuration: row.aoeDuration,
    explosionFoci: row.explosionFoci,
    forwardShots: row.forwardShots,
    diagonalShotsPerSide: row.diagonalShotsPerSide,
    diagonalAngleDeg: row.diagonalAngleDeg,
    forwardSpread: row.forwardSpread,
    width: row.width,
    length: row.length,
    angleDeg: row.angleDeg,
    ticksPerSec: row.ticksPerSec,
    dps: row.dps,
    energyPerSec: row.energyPerSec,
  }
}

export function resolveEquips(equips: EquipsState): ResolveEquipsResult {
  const stamp = parseWeaponStamp(equips.slots.weapon)
  let weapon: ResolvedWeaponStats | null = null
  if (stamp) {
    const row = levelsFor(stamp.weaponId).find((entry) => entry.level === stamp.level)
    if (row) {
      const summed = addWeaponMods(
        { damage: row.damage, rate: row.rate, speed: row.speed, radius: row.radius },
        modsFromGeneral(equips.general),
      )
      weapon = snapshotFromRow(stamp.weaponId, row, summed)
    }
  }
  const dashStamp = parseDashStamp(equips.slots.dash)
  const dash = dashStamp ? (dashLevel(dashStamp.level) ?? null) : null
  return { weapon, dash }
}

export function overlayResolvedWeapon(cfg: WeaponConfig, resolved: ResolvedWeaponStats): void {
  patchWeaponStat(cfg, 'damage', resolved.damage)
  patchWeaponStat(cfg, 'rate', resolved.rate)
  patchWeaponStat(cfg, 'speed', resolved.speed)
  patchWeaponStat(cfg, 'radius', resolved.radius)
}

export const EQUIP_CATALOG = {
  mods: EQUIP_MODS,
  slots: EQUIP_SLOT_IDS,
  weaponStamps: WEAPON_STAMP_IDS,
  dashStamps: DASH_STAMP_IDS,
  defaults: {
    player: defaultPlayerEquips(),
    enemy: defaultEnemyEquips(),
  },
} as const
