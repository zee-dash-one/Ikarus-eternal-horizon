import type { GrantContext } from '../sheet/char-sheet.ts'

export interface EquipGrant {
  readonly field: string
  readonly value: number
  readonly when?: GrantContext
}

export function isValidGrantContext(when: string | undefined): when is GrantContext | undefined {
  if (when === undefined) {
    return true
  }
  return when === 'dashing' || when === 'shield_empty' || when === 'integrity_severe'
}

export function validateEquipGrant(grant: { field: string; value: number; when?: string }): boolean {
  return isValidGrantContext(grant.when)
}
