/**
 * Naming: .docs3/specs/rankings/RNK-01.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/rankings.spec.MD → RNK-01
 * Decision(s): D30 D39
 * Tags       : tag_g_rankings tag_s_rankings_local_adapter
 * Priority   : must
 * Theme      : Theme 10 — Run meta
 * Render     : N/A (Local adapter; DOM UI in RNK-04)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Survives reload"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const RNK = resolve(REPO_ROOT, 'poc3/src/systems/ranking-manager.ts');

describe('RNK-01 — Local bests survive reload', () => {
  it('RankingManager module exists', () => {
    expect(existsSync(RNK), 'ranking-manager.ts').toBe(true);
    expect(readFileSync(RNK, 'utf8')).toMatch(/RankingManager/);
  });

  it('survives reload', () => {
    expect(true).toBe(false);
  });

  it.todo('LocalRankingAdapter always mirrors via Dexie (D39)');
});
