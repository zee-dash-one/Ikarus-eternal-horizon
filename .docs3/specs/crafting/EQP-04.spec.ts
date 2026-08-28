/**
 * Naming: .docs3/specs/crafting/EQP-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/crafting.spec.MD → EQP-04
 * Decision(s): D31 D21
 * Tags       : tag_g_crafting tag_s_crafting_craft_slot
 * Priority   : must
 * Theme      : Theme 12 — Equipment, craft, progression
 * Render     : N/A (Pause Lab UI later · SCENE-05)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Second craft blocked while timer active"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CRAFT = resolve(REPO_ROOT, 'poc3/src/systems/craft-manager.ts');

describe('EQP-04 — Exclusive CraftSlot', () => {
  it('CraftManager module exists', () => {
    expect(existsSync(CRAFT), 'craft-manager.ts').toBe(true);
    expect(readFileSync(CRAFT, 'utf8')).toMatch(/CraftManager/);
  });

  it('second craft blocked while timer active', () => {
    expect(true).toBe(false);
  });

  it.todo('craft only on Pause → Lab (D31)');
});
