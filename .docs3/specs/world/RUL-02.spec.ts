/**
 * Naming: .docs3/specs/world/RUL-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/world.spec.MD → RUL-02
 * Decision(s): D32 D40 D46
 * Tags       : tag_g_world tag_s_world_playfield_bounds tag_g_drops tag_s_drops_fragment_pool
 * Priority   : must
 * Theme      : Theme 2 — World presentation
 * Render     : N/A (Core recycle; View keeps pooled meshes)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Long fire / meteor / drop session does not grow off-screen population"
 *
 * Golden Rule reminder (D40): Core releases to pool — never dispose GPU
 * from systems/. Box is BALANCE.world.despawn. Player is clamped, not despawned.
 *
 * Theme 5/6/7 tests import this contract — do not invent a second box.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BALANCER = resolve(REPO_ROOT, 'poc3/src/core/balancer.ts');
const SYSTEMS = resolve(REPO_ROOT, 'poc3/src/systems');

const OWNERS = [
  'shot-manager.ts',
  'meteor-manager.ts',
  'drop-manager.ts',
  'enemy-manager.ts',
] as const;

describe('RUL-02 — Playfield bounds + off-area despawn', () => {
  it('BALANCE.world.despawn is the single recycle box', () => {
    expect(existsSync(BALANCER), 'poc3/src/core/balancer.ts').toBe(true);
    const src = readFileSync(BALANCER, 'utf8');
    expect(src).toMatch(/despawn/);
  });

  it('owning Managers exist and recycle off-field entities to pool', () => {
    for (const file of OWNERS) {
      expect(existsSync(resolve(SYSTEMS, file)), file).toBe(true);
    }
    expect(true).toBe(false);
  });

  it('player craft is clamped to the playfield and does not despawn', () => {
    expect(true).toBe(false);
  });

  it.todo('despawn path allocates nothing on the hot tick');

  it.todo('despawn is ship/playfield-relative — not the free-cam frustum (CAM-06)');
});
