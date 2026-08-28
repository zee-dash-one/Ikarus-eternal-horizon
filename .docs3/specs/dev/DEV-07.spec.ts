/**
 * Naming: .docs3/specs/dev/DEV-07.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/dev-tools.spec.MD → DEV-07
 * Decision(s): D43 D08
 * Tags       : tag_g_dev tag_s_dev_entities tag_s_char_equip_slots
 * Priority   : must
 * Theme      : Theme 0d — Dev content CRUD
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Missing/unknown type → validation error; no save"
 */

import { describe, it, expect } from 'vitest';

const EXPECTED_EQUIP_TYPES = [
  'generic',
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
] as const;

describe('DEV-07 — Equip form requires equipType', () => {
  it('equipType enum is generic plus the 12 CHAR Special ids', () => {
    // given: DevEquipRecord / EQUIP_TYPES
    // when: the constant is read
    // then: same set as EXPECTED_EQUIP_TYPES (13 values)
    expect(true).toBe(false);
  });

  it('create/update without equipType is rejected', () => {
    // given: DevContentManager.create('equips', { id, displayName, grants: [] })
    // when: equipType is omitted or unknown ('weapon')
    // then: validation error; record not persisted
    expect(true).toBe(false);
  });

  it.todo('equipType generic exports GenericEquipItem; Special id exports SpecialEquipItem');
});
