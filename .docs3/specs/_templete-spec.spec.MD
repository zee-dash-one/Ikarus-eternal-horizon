/**
 * SPEC TEMPLATE — copy this file; do not edit it in place.
 *
 * Naming: .docs3/specs/<domain>/<REQUIREMENT-ID>.spec.ts
 *   e.g. .docs3/specs/char/CHAR-04.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for <REQUIREMENT-ID> is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/<file>.spec.MD → <REQUIREMENT-ID>
 * Decision(s): D0X (if applicable — see decisions.spec.MD)
 * Tags       : tag_g_<domain> tag_s_<domain>_<topic>
 * Priority   : must | should | defer   (copy from Requirements table)
 * Theme      : Theme N — <theme name from todo.md>
 * Render     : canvas | DOM   (if SCENE-/AUTH-/STR-/RNK- UI — see D23/D34/D41/D42)
 * -----------------------------------------------------------------
 *
 * Acceptance (paste verbatim from the `Requirements` table in the design
 * .spec.MD — do not paraphrase; if design changes, update this comment):
 *
 *   "<paste exact Acceptance column text here>"
 *
 * Golden Rule reminder (D07/D40): if this requirement touches the frame
 * loop, tests below must prove only Summary Sheet / Commands/Events are
 * read — never Full Sheet, never DOM/Three inside core/ or systems/.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import { /* system under test */ } from '../../../poc3/src/...';

describe('<REQUIREMENT-ID> — <short requirement title>', () => {
  beforeEach(() => {
    // arrange: minimal deterministic state (no spurious alloc,
    // no unseeded RNG — combat/loot rolls must be seedable)
  });

  it('<behavior 1 — happy path, straight from Acceptance>', () => {
    // given: ...
    // when: ...
    // then: ...
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it.todo('<behavior 2 — edge case from Rule/Detail table>');

  it.todo('<behavior 3 — negative rule: what must NOT happen>');

  // If the requirement relates to D07 (Summary-only) or D24 (precomputed MIT),
  // include an explicit guard test, for example:
  //
  // it('never reads Full Sheet fields on the hot path', () => {
  //   const spy = vi.spyOn(fullSheet, 'get');
  //   system.update(dt);
  //   expect(spy).not.toHaveBeenCalled();
  // });
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
