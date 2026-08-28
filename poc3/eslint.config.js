import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/** @see .docs3/templates/eslint-sim-boundary.snippet.js — D40 / ARCH-16 */
const simBoundaryGuardrails = [
  {
    files: [
      'src/core/**/*.ts',
      'src/systems/**/*.ts',
      'src/gameobjects/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'three',
              message: 'Core/Sim must not import Three.js (D40 · ARCH-16).',
            },
          ],
          patterns: [
            {
              group: ['three/*', '**/render/*', '**/render/**'],
              message: 'Core/Sim must not import View layer (D40 · ARCH-16).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message: 'Core/Sim must not use DOM globals (D40 · ARCH-16).',
        },
        {
          name: 'document',
          message: 'Core/Sim must not use DOM globals (D40 · ARCH-16).',
        },
      ],
    },
  },
]

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...simBoundaryGuardrails,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message:
            'Use named exports: one public class per kebab-case file (planning.spec.MD §8).',
        },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
)
