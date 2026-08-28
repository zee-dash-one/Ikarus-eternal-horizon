/**
 * Naming: .docs3/specs/rankings/RNK-04.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/rankings.spec.MD → RNK-04
 * Decision(s): D42 D23
 * Tags       : tag_g_rankings tag_s_scene_rankings_ui tag_s_scene_rankings_board
 * Priority   : should
 * Theme      : Theme 10 — Run meta
 * Render     : DOM (#rankings-root)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Tabs show separated local bests"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const INDEX = resolve(REPO_ROOT, 'poc3/index.html');

describe('RNK-04 — Rankings DOM UI', () => {
  it('shell exposes #rankings-root', () => {
    expect(existsSync(INDEX), 'poc3/index.html').toBe(true);
    expect(readFileSync(INDEX, 'utf8')).toMatch(/rankings-root/);
  });

  it('tabs show separated local bests', () => {
    expect(true).toBe(false);
  });

  it.todo('RankingsUIBridge ↔ RankingManager — no WebSocket (D42)');
});
