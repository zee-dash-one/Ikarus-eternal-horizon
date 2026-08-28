import type { PerspectiveCamera } from 'three'
import { Group } from 'three'
import { BALANCE } from '../core/balancer.ts'
import { ParallaxLayer } from './parallax-layer.ts'

/** POC2 ParallaxField — three dynamic view layers pinned to the camera. */
export class ParallaxField {
  readonly root: Group
  readonly layers: readonly ParallaxLayer[]

  constructor() {
    this.root = new Group()
    this.layers = BALANCE.parallax.layers.map((config) => new ParallaxLayer(config))
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
