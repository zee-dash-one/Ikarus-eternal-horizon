import type { GameScene } from './game-scene.ts'
import type { GameRenderer } from '../render/renderer.ts'

export interface TitleSceneDeps {
  readonly renderer: GameRenderer
  readonly onRun: () => void
}

export class TitleScene implements GameScene {
  readonly id = 'title'
  private readonly _deps: TitleSceneDeps

  constructor(deps: TitleSceneDeps) {
    this._deps = deps
  }

  mount(): void {
    /* title canvas stub */
  }

  update(): void {
    /* auto-enter run on action in full game; manual via goToRun */
  }

  syncRender(): void {
    this._deps.renderer.render()
  }

  goToRun(): void {
    this._deps.onRun()
  }

  dispose(): void {
    /* keep shared renderer */
  }
}
