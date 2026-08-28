/**
 * Naming: .docs3/specs/dev/DEV-02.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/dev-tools.spec.MD → DEV-02
 * Decision(s): D43 D34
 * Tags       : tag_g_dev tag_s_dev_ui tag_s_dev_ui_bridge tag_s_dev_content_manager
 * Priority   : must
 * Theme      : Theme 0d — Dev content CRUD
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Same bridge pattern as Store/Login"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const BRIDGE = resolve(REPO_ROOT, 'poc3/src/ui/dev-crud-bridge.ts');
const MGR = resolve(REPO_ROOT, 'poc3/src/systems/dev-content-manager.ts');

describe('DEV-02 — HTML/CSS + DevCrudBridge ↔ DevContentManager', () => {
  it('DevCrudBridge and DevContentManager modules exist', () => {
    expect(existsSync(BRIDGE), 'poc3/src/ui/dev-crud-bridge.ts').toBe(true);
    expect(existsSync(MGR), 'poc3/src/systems/dev-content-manager.ts').toBe(true);
  });

  it('DevCrudBridge does not use WebSocket', () => {
    expect(existsSync(BRIDGE)).toBe(true);
    expect(readFileSync(BRIDGE, 'utf8')).not.toMatch(/WebSocket/);
  });

  it.todo('#dev-crud-root is DOM chrome (not a canvas scene)');
});
