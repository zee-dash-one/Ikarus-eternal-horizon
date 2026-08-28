export type AssetBucket = 'critical' | 'warm' | 'deferred'

export interface AssetHandle {
  readonly id: string
  readonly bucket: AssetBucket
  readonly ready: boolean
}

export class AssetManager {
  private readonly _cache = new Map<string, AssetHandle>()
  private _criticalReady = false
  private _welcomeFired = false

  get criticalReady(): boolean {
    return this._criticalReady
  }

  get welcomeFired(): boolean {
    return this._welcomeFired
  }

  preload(): void {
    const critical: AssetHandle[] = [
      { id: 'cockpit', bucket: 'critical', ready: true },
      { id: 'balance', bucket: 'critical', ready: true },
    ]
    for (const a of critical) {
      this._cache.set(a.id, a)
    }
    this._criticalReady = critical.every((a) => a.ready)
  }

  fireWelcomeIfReady(playCue: (cue: string) => void): void {
    if (this._criticalReady && !this._welcomeFired) {
      this._welcomeFired = true
      playCue('welcome_screen_ready')
    }
  }

  get(id: string): AssetHandle | undefined {
    return this._cache.get(id)
  }
}
