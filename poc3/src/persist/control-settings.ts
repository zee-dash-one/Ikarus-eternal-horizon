import {
  cloneInputBindings,
  createDefaultInputBindings,
  isInputBindings,
  normalizeInputBindings,
  type InputBindings,
} from '../core/input-bindings.ts'
import type { InputScheme } from '../core/input-types.ts'
import { getLocalDb } from './local-db.ts'

const SETTINGS_KEY = 'controls'

export interface ControlSettings {
  readonly scheme: InputScheme
  readonly bindings: InputBindings
}

const DEFAULT_SETTINGS: ControlSettings = {
  scheme: 'keyboard',
  bindings: createDefaultInputBindings(),
}

function isInputScheme(value: string): value is InputScheme {
  return value === 'keyboard' || value === 'mix' || value === 'gamepad' || value === 'touch'
}

export async function loadControlSettings(): Promise<ControlSettings> {
  try {
    const row = await getLocalDb().storeCache.get(SETTINGS_KEY)
    if (!row) {
      return DEFAULT_SETTINGS
    }
    const parsed = JSON.parse(row.payload) as Partial<ControlSettings>
    const scheme = parsed.scheme && isInputScheme(parsed.scheme) ? parsed.scheme : DEFAULT_SETTINGS.scheme
    const bindings = isInputBindings(parsed.bindings)
      ? normalizeInputBindings(cloneInputBindings(parsed.bindings))
      : createDefaultInputBindings()
    return { scheme, bindings }
  } catch {
    /* ignore corrupt storage */
  }
  return DEFAULT_SETTINGS
}

export async function saveControlSettings(settings: ControlSettings): Promise<void> {
  await getLocalDb().storeCache.put({
    key: SETTINGS_KEY,
    payload: JSON.stringify(settings),
    updatedAt: Date.now(),
  })
}
