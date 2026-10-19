import {
  cloneInputBindings,
  createDefaultInputBindings,
  isInputBindings,
  normalizeInputBindings,
  type InputBindings,
} from '../core/input-bindings.ts'
import type { InputScheme } from '../core/input-types.ts'
import type { ProfileStore } from './profile-store.ts'

const SETTINGS_KEY = 'controls'

export interface ControlSettings {
  readonly scheme: InputScheme
  readonly bindings: InputBindings
}

export function createDefaultControlSettings(): ControlSettings {
  return { scheme: 'keyboard', bindings: createDefaultInputBindings() }
}

function isInputScheme(value: string): value is InputScheme {
  return value === 'keyboard' || value === 'mix' || value === 'gamepad' || value === 'touch'
}

export async function loadControlSettings(store: ProfileStore): Promise<ControlSettings> {
  const row = await store.load(SETTINGS_KEY)
  if (!row) return createDefaultControlSettings()
  const parsed = row.payload as Partial<ControlSettings> | null
  if (row.schemaVersion !== 1 || !parsed || typeof parsed.scheme !== 'string' || !isInputScheme(parsed.scheme) || !isInputBindings(parsed.bindings)) {
    throw new Error('Preferências de controles inválidas ou de uma versão incompatível.')
  }
  return { scheme: parsed.scheme, bindings: normalizeInputBindings(cloneInputBindings(parsed.bindings)) }
}

export async function saveControlSettings(store: ProfileStore, settings: ControlSettings): Promise<void> {
  await store.save(SETTINGS_KEY, { schemaVersion: 1, payload: settings })
}
