/**
 * Naming: .docs3/specs/arch/ARCH-05.spec.ts
 *
 * -----------------------------------------------------------------
 * Source     : plans/architecture.spec.MD → ARCH-05
 * Decision(s): D38 D41
 * Tags       : tag_g_builds tag_s_arch_demohost_api tag_s_auth_adapter_demo
 * Priority   : must
 * Theme      : Theme 0b — Login (auth gate)
 * Render     : DOM
 * -----------------------------------------------------------------
 *
 * Acceptance (verbatim from Requirements):
 *
 *   "Callback sets cookie; `/api/me` returns session"
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const DEMO_HOST = resolve(REPO_ROOT, 'demo-host');

describe('ARCH-05 — Google OAuth real on Demo', () => {
  it('demo-host exposes Google callback and GET /api/me', () => {
    expect(existsSync(resolve(DEMO_HOST, 'package.json')), 'demo-host/package.json').toBe(
      true,
    );
    const srcDir = resolve(DEMO_HOST, 'src');
    expect(existsSync(srcDir), 'demo-host/src').toBe(true);
    const indexCandidates = [
      resolve(srcDir, 'index.ts'),
      resolve(srcDir, 'app.ts'),
      resolve(DEMO_HOST, 'src/routes/auth.ts'),
    ];
    const found = indexCandidates.filter((p) => existsSync(p));
    expect(found.length, 'auth route module').toBeGreaterThan(0);
    const blob = found.map((p) => readFileSync(p, 'utf8')).join('\n');
    expect(blob).toMatch(/\/api\/auth\/google\/callback|google\/callback/);
    expect(blob).toMatch(/\/api\/me/);
  });

  it.todo('OAuth callback Set-Cookie is httpOnly; GET /api/me returns AuthSession');
});
