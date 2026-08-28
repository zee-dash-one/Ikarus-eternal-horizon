/**
 * Naming: .docs3/specs/arch/ARCH-18.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-18
 * Decision(s): D40
 * Tags       : tag_g_engine tag_s_engine_command_event_flow tag_s_engine_core_view_split
 * Priority   : must
 * Theme      : Theme 0 — Project scaffold
 * Render     : N/A (Core types)
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Input sends Commands; View never mutates sim state"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CORE = resolve(REPO_ROOT, 'poc3/src/core');

describe('ARCH-18 — Unidirectional Command → Event/Snapshot', () => {
  it('core/ defines Command, Domain Event, and WorldSnapshot types', () => {
    const commandPath = resolve(CORE, 'command.ts');
    const eventPath = resolve(CORE, 'event.ts');
    const snapshotPath = resolve(CORE, 'world-snapshot.ts');
    expect(existsSync(commandPath), 'poc3/src/core/command.ts').toBe(true);
    expect(existsSync(eventPath), 'poc3/src/core/event.ts').toBe(true);
    expect(existsSync(snapshotPath), 'poc3/src/core/world-snapshot.ts').toBe(true);
    expect(readFileSync(commandPath, 'utf8')).toMatch(/export (type|interface) Command/);
    expect(readFileSync(eventPath, 'utf8')).toMatch(/export (type|interface) (Domain)?Event/);
    expect(readFileSync(snapshotPath, 'utf8')).toMatch(/export (type|interface) WorldSnapshot/);
  });

  it.todo('InputManager enqueue only sends Command objects into Core');

  it.todo('View / syncRender never mutates Core state (read snapshot + events only)');
});
