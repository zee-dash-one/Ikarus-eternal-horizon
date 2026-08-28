export const SPECIAL_SLOT_IDS = [
  'Primary_Weapon',
  'Secondary_Weapon',
  'Dash',
  'Bomb',
  'Wings',
  'Shield',
  'Armor',
  'Rockets',
  'Engine',
  'Collector',
  'Converter',
  'Lab',
] as const

export type SpecialSlotId = (typeof SPECIAL_SLOT_IDS)[number]

export const SPECIAL_SLOT_COUNT = 12
export const GENERIC_SLOT_COUNT = 21
export const EFFECT_SLOT_COUNT = 21
export const CHAR_SLOT_COUNT =
  SPECIAL_SLOT_COUNT + GENERIC_SLOT_COUNT + EFFECT_SLOT_COUNT

export type IntegrityState = 'LIGHT' | 'MEDIUM' | 'SEVERE' | 'DRIFTING' | 'DEAD'

export type GrantContext = 'dashing' | 'shield_empty' | 'integrity_severe'

export const GRANT_CONTEXTS: readonly GrantContext[] = [
  'dashing',
  'shield_empty',
  'integrity_severe',
] as const

export interface SlotOccupant {
  itemId: string | null
}

export interface SpecialSlots {
  Primary_Weapon: SlotOccupant
  Secondary_Weapon: SlotOccupant
  Dash: SlotOccupant
  Bomb: SlotOccupant
  Wings: SlotOccupant
  Shield: SlotOccupant
  Armor: SlotOccupant
  Rockets: SlotOccupant
  Engine: SlotOccupant
  Collector: SlotOccupant
  Converter: SlotOccupant
  Lab: SlotOccupant
}

export interface FullCharSheet {
  special: SpecialSlots
  generic: SlotOccupant[]
  effects: SlotOccupant[]
}

export interface SummarySheet {
  ENE: number
  SHD: number
  DEF: number
  MIT: number
  SPD: number
  S_D: number
  S_R: number
  REG: number
  LVL: number
  HP: number
  integrity_cur: number
  integrity_max: number
  integrityState: IntegrityState
}

export function createEmptyCharSheet(): FullCharSheet {
  const special = {} as SpecialSlots
  for (const id of SPECIAL_SLOT_IDS) {
    special[id] = { itemId: null }
  }
  return {
    special,
    generic: Array.from({ length: GENERIC_SLOT_COUNT }, () => ({ itemId: null })),
    effects: Array.from({ length: EFFECT_SLOT_COUNT }, () => ({ itemId: null })),
  }
}

export function createDefaultSummary(): SummarySheet {
  return {
    ENE: 100,
    SHD: 100,
    DEF: 10,
    MIT: 1,
    SPD: 12,
    S_D: 10,
    S_R: 8,
    REG: 8,
    LVL: 1,
    HP: 100,
    integrity_cur: 100,
    integrity_max: 100,
    integrityState: 'LIGHT',
  }
}

export function integrityStateFromCur(
  integrityCur: number,
  integrityMax: number,
  wasDrifting: boolean,
): IntegrityState {
  if (wasDrifting && integrityCur <= 0) {
    return 'DEAD'
  }
  if (integrityCur <= 0) {
    return 'DRIFTING'
  }
  const pct = integrityCur / integrityMax
  if (pct > 0.66) {
    return 'LIGHT'
  }
  if (pct > 0.33) {
    return 'MEDIUM'
  }
  return 'SEVERE'
}

export function integritySpeedMultiplier(state: IntegrityState): number {
  switch (state) {
    case 'LIGHT':
      return 1
    case 'MEDIUM':
      return 0.8
    case 'SEVERE':
      return 0.5
    case 'DRIFTING':
      return 0.1
    case 'DEAD':
      return 0
  }
}
