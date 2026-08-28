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

/** Runtime ship flags — pulse + post-action cooldown (POC2 ship.status port). */
export interface ShipStatus {
  readonly dashing: boolean
  readonly shooting: boolean
  readonly bombing: boolean
  /** True only when dashing, shooting and bombing are all false. */
  readonly energizing: boolean
}

export interface ShipCooldownBalance {
  readonly dashingMs: number
  readonly shootingMs: number
  readonly bombingMs: number
}

/** Tracks active actions and cooldown tails for energy regen gating. */
export class ShipStatusTracker implements ShipStatus {
  private _dashing = false
  private _shooting = false
  private _bombing = false
  private _dashActive = false
  private _shootActive = false
  private _dashCdMs = 0
  private _shootCdMs = 0
  private _bombCdMs = 0

  get dashing(): boolean {
    return this._dashing
  }

  get shooting(): boolean {
    return this._shooting
  }

  get bombing(): boolean {
    return this._bombing
  }

  get energizing(): boolean {
    return !this._dashing && !this._shooting && !this._bombing
  }

  setDashingActive(active: boolean, cooldownMs: number): void {
    if (active) {
      this._dashActive = true
      this._dashing = true
      this._dashCdMs = 0
      return
    }
    if (!this._dashActive) {
      return
    }
    this._dashActive = false
    this._dashCdMs = cooldownMs
  }

  setShootingActive(active: boolean, cooldownMs: number): void {
    if (active) {
      this._shootActive = true
      this._shooting = true
      this._shootCdMs = 0
      return
    }
    if (!this._shootActive) {
      return
    }
    this._shootActive = false
    this._shootCdMs = cooldownMs
  }

  pulseBombing(cooldownMs: number): void {
    this._bombing = true
    this._bombCdMs = cooldownMs
  }

  tick(dtMs: number): void {
    if (dtMs <= 0) {
      return
    }
    if (!this._dashActive && this._dashCdMs > 0) {
      this._dashCdMs = Math.max(0, this._dashCdMs - dtMs)
      if (this._dashCdMs === 0) {
        this._dashing = false
      }
    }
    if (!this._shootActive && this._shootCdMs > 0) {
      this._shootCdMs = Math.max(0, this._shootCdMs - dtMs)
      if (this._shootCdMs === 0) {
        this._shooting = false
      }
    }
    if (this._bombCdMs > 0) {
      this._bombCdMs = Math.max(0, this._bombCdMs - dtMs)
      if (this._bombCdMs === 0) {
        this._bombing = false
      }
    }
  }
}
