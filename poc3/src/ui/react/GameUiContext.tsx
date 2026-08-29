import { useSyncExternalStore } from 'react'
import { getGameUiController } from '../game-ui-store.ts'
import type { GameUiController } from '../game-ui-controller.ts'

export function useGameUiSnapshot(): GameUiController {
  const controller = getGameUiController()
  useSyncExternalStore(
    (onStoreChange) => controller.subscribe(onStoreChange),
    () => `${controller.revision}:${controller.bindingsRev}`,
    () => `${controller.revision}:${controller.bindingsRev}`,
  )
  return controller
}
