import type { GameScene } from './game-scene.ts'

export class SceneManager {
  private _current: GameScene | null = null

  get current(): GameScene | null {
    return this._current
  }

  mount(scene: GameScene): void {
    this._current?.dispose()
    this._current = scene
    scene.mount()
  }

  update(dt: number): void {
    this._current?.update(dt)
  }

  syncRender(): void {
    this._current?.syncRender()
  }

  dispose(): void {
    this._current?.dispose()
    this._current = null
  }
}
