import type { GameScene } from './game-scene.ts'
import type { AssetManager } from '../systems/asset-manager.ts'
import type { SoundManager } from '../systems/sound-manager.ts'
import type { GameRenderer } from '../render/renderer.ts'

export interface StartSceneDeps {
  readonly assets: AssetManager
  readonly sound: SoundManager
  readonly renderer: GameRenderer
  readonly onStart: () => void
}

export class StartScene implements GameScene {
  readonly id = 'start'
  private readonly _deps: StartSceneDeps
  private _mounted = false
  private _preparing = false
  private _startEnabled = false
  private _clickedEarly = false

  constructor(deps: StartSceneDeps) {
    this._deps = deps
  }

  mount(): void {
    this._mounted = true
    this._deps.assets.preload()
    this._startEnabled = this._deps.assets.criticalReady
    this._deps.assets.fireWelcomeIfReady((cue) => this._deps.sound.playCue(cue))
  }

  update(): void {
    if (!this._mounted) return
    if (this._deps.assets.criticalReady && !this._startEnabled) {
      this._startEnabled = true
      this._deps.assets.fireWelcomeIfReady((cue) => this._deps.sound.playCue(cue))
    }
    if (this._clickedEarly && this._startEnabled) {
      this._clickedEarly = false
      this._mounted = false
      this._deps.onStart()
    }
  }

  syncRender(): void {
    this._deps.renderer.render()
  }

  tryStart(): void {
    if (!this._mounted) return
    this._deps.sound.unlock()
    if (this._startEnabled) {
      this._mounted = false
      this._deps.onStart()
    } else {
      this._clickedEarly = true
      this._preparing = true
    }
  }

  get preparing(): boolean {
    return this._preparing && !this._startEnabled
  }

  dispose(): void {
    this._mounted = false
  }
}
