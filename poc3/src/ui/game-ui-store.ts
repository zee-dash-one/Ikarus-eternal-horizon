import { GameUiController } from './game-ui-controller.ts'

let instance: GameUiController | null = null

export function getGameUiController(): GameUiController {
  if (!instance) {
    instance = new GameUiController()
  }
  return instance
}
