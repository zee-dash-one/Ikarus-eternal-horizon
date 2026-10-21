import type { PerspectiveCamera } from 'three'
import { Group } from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { ParallaxLayerBalance } from '../core/balancer.ts'
import { ParallaxLayer } from './parallax-layer.ts'
import { deriveSeed, seededRandom } from '../core/seeded-random.ts'

/** POC2 ParallaxField — three dynamic view layers pinned to the camera. */
export class ParallaxField {
  readonly root: Group
  readonly layers: readonly ParallaxLayer[]

  constructor(configs: readonly ParallaxLayerBalance[] = BALANCE.parallax.layers, cosmeticSeed?: string) {
    this.root = new Group()
    this.layers = configs.map((config) => new ParallaxLayer(config, cosmeticSeed === undefined ? Math.random : seededRandom(deriveSeed(cosmeticSeed, config.name))))
    for (const layer of this.layers) {
      this.root.add(layer.group)
    }
  }

  update(dt: number, camera: PerspectiveCamera): void {
    for (const layer of this.layers) {
      layer.update(dt, camera)
    }
  }

  syncRender(): void {
    for (const layer of this.layers) {
      layer.syncRender()
    }
  }

  dispose(): void {
    for (const layer of this.layers) {
      layer.dispose()
    }
    this.root.clear()
  }
}
