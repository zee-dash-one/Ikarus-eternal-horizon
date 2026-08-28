import type { InputScheme } from '../core/input-types.ts'
import { getLocalDb } from './local-db.ts'

const SETTINGS_KEY = 'controls'

export interface ControlSettings {
  readonly scheme: InputScheme
}

const DEFAULT_SETTINGS: ControlSettings = {
  scheme: 'keyboard',
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
    if (parsed.scheme && isInputScheme(parsed.scheme)) {
      return { scheme: parsed.scheme }
    }
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
