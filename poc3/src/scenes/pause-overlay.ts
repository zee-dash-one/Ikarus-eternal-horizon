import type { GameScene } from './game-scene.ts'
import type { GameRenderer } from '../render/renderer.ts'
import type { InputManager } from '../systems/input-manager.ts'
import type { SoundManager } from '../systems/sound-manager.ts'
import type { CameraManager } from '../systems/camera-manager.ts'
import type { RunScene } from './run-scene.ts'
import type { GameLoop } from '../core/game-loop.ts'

export type PauseTab = 'controls' | 'audio' | 'graphics' | 'dev'

export interface PauseOverlayDeps {
  readonly renderer: GameRenderer
  readonly loop: GameLoop
  readonly input: InputManager
  readonly sound: SoundManager
  readonly camera: CameraManager
  readonly run: RunScene
  readonly onResume: () => void
  readonly isDev: boolean
}

export class PauseOverlay implements GameScene {
  readonly id = 'pause'
  private readonly _deps: PauseOverlayDeps
  private _tab: PauseTab = 'controls'
  private _mounted = false

  constructor(deps: PauseOverlayDeps) {
    this._deps = deps
  }

  get activeTab(): PauseTab {
    return this._tab
  }

  mount(): void {
    this._mounted = true
    this._deps.loop.pause()
  }

  setTab(tab: PauseTab): void {
    if (tab === 'dev' && !this._deps.isDev) {
      return
    }
    this._tab = tab
  }

  update(dt: number): void {
    if (!this._mounted) return
    this._deps.input.update(dt)
    if (this._deps.input.wasPressed('Start')) {
      this.resume()
    }
  }

  resume(): void {
    this._deps.loop.resume()
    this._deps.onResume()
  }

  syncRender(): void {
    this._deps.run.syncRender()
    this._drawOverlay()
  }

  private _drawOverlay(): void {
    const canvas = this._deps.renderer.scene.userData.canvas as
      | HTMLCanvasElement
      | undefined
    void canvas
    /* 2D pause chrome drawn via DOM overlay in game-app for accessibility */
  }

  dispose(): void {
    this._mounted = false
    /* do not tear down Run scene */
  }
}
