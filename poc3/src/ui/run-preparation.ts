import { BALANCE } from '../core/balancer.ts'
import type { PreparationProgress } from '../core/run-plan.ts'
import { RunPreparationManager } from '../systems/run-preparation-manager.ts'
import type { RunResultManager } from '../systems/run-result-manager.ts'
import { RunViewResources } from '../render/run-view-resources.ts'
import type { GameRenderer } from '../render/renderer.ts'

/** A real frame yield lets preparation progress and Cancel remain interactive. */
function nextFrame(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Preparação cancelada.')); return }
    const abort = () => { cancelAnimationFrame(frame); reject(new Error('Preparação cancelada.')) }
    const frame = requestAnimationFrame(() => { signal.removeEventListener('abort', abort); resolve() })
    signal.addEventListener('abort', abort, { once: true })
  })
}
export function prepareRunWorld(results: RunResultManager, signal: AbortSignal, renderer: GameRenderer, onProgress: (progress: PreparationProgress) => void) {
  return new RunPreparationManager().prepare(results, { world: BALANCE.world, preparation: BALANCE.preparation, parallax: BALANCE.parallax.layers }, signal, {
    createView: (layers, visuals, cosmeticSeed) => new RunViewResources(layers, (root) => renderer.prewarm(root), visuals, cosmeticSeed),
    yieldControl: nextFrame, onProgress,
  })
}
