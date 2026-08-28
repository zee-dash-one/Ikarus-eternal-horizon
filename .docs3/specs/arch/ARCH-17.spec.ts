/**
 * Naming: .docs3/specs/arch/ARCH-17.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-17
 * Decision(s): D40 D21
 * Tags       : tag_g_engine tag_s_engine_fixed_tick tag_s_engine_game_loop tag_s_engine_core_view_split
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : canvas (Run loop later)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Sim at 60 Hz constant SIM_DT; View reads snapshot on rAF"
 *
 * Golden Rule reminder (D07/D40): GameLoop lives in core/ — no three/DOM.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CORE = resolve(REPO_ROOT, 'poc3/src/core');

describe('ARCH-17 — Fixed-tick Core decoupled from rAF View', () => {
  it('core/ exports SIM_DT for 60 Hz (1/60)', () => {
    // given: GameLoop / tick module under poc3/src/core
    // when: SIM_DT is read
    // then: SIM_DT === 1 / 60
    const loopPath = resolve(CORE, 'game-loop.ts');
    expect(existsSync(loopPath), 'poc3/src/core/game-loop.ts').toBe(true);
    const src = readFileSync(loopPath, 'utf8');
    expect(src).toMatch(/SIM_DT/);
    expect(src).toMatch(/1\s*\/\s*60/);
  });

  it.todo('GameLoop.step(simDt) does not call requestAnimationFrame');

  it.todo('View syncRender reads WorldSnapshot on rAF and does not step Core');

  it.todo('pause gate stops Core ticks only (D21); View may still paint');
});
