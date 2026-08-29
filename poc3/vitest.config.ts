import { defineConfig } from 'vitest/config'

/** Themes 0–4b SDD specs only — stop before Theme 5 per POC3 slice plan. */
const themeSpecs = [
  '../.docs3/specs/arch/ARCH-01.spec.ts',
  '../.docs3/specs/arch/ARCH-02.spec.ts',
  '../.docs3/specs/arch/ARCH-05.spec.ts',
  '../.docs3/specs/arch/ARCH-08.spec.ts',
  '../.docs3/specs/arch/ARCH-16.spec.ts',
  '../.docs3/specs/arch/ARCH-17.spec.ts',
  '../.docs3/specs/arch/ARCH-18.spec.ts',
  '../.docs3/specs/arch/ARCH-19.spec.ts',
  '../.docs3/specs/arch/ARCH-20.spec.ts',
  '../.docs3/specs/auth/AUTH-*.spec.ts',
  '../.docs3/specs/scenes/SCENE-01.spec.ts',
  '../.docs3/specs/scenes/SCENE-02.spec.ts',
  '../.docs3/specs/scenes/SCENE-05.spec.ts',
  '../.docs3/specs/input/CTRL-01.spec.ts',
  '../.docs3/specs/input/CTRL-02.spec.ts',
  '../.docs3/specs/input/CTRL-03.spec.ts',
  '../.docs3/specs/input/CTRL-04.spec.ts',
  '../.docs3/specs/balance/RUL-12.spec.ts',
  '../.docs3/specs/world/CAM-*.spec.ts',
  '../.docs3/specs/world/RUL-02.spec.ts',
  '../.docs3/specs/char/CHAR-01.spec.ts',
  '../.docs3/specs/char/CHAR-02.spec.ts',
  '../.docs3/specs/char/CHAR-03.spec.ts',
  '../.docs3/specs/char/CHAR-04.spec.ts',
  '../.docs3/specs/char/CHAR-05.spec.ts',
  '../.docs3/specs/char/CHAR-06.spec.ts',
  '../.docs3/specs/equipment/EQP-02.spec.ts',
]

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', ...themeSpecs],
    environment: 'node',
    globals: false,
    passWithNoTests: true,
  },
})
