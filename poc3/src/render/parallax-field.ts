import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'
import { BALANCE } from '../core/balancer.ts'

export class ParallaxField {
  readonly root: Group
  private readonly _layers: Group[] = []

  constructor() {
    this.root = new Group()
    for (const layer of BALANCE.parallax.layers) {
      const g = new Group()
      const geo = new PlaneGeometry(2, 2)
      const mat = new MeshBasicMaterial({ color: layer.color })
      for (let i = 0; i < layer.count; i++) {
        const m = new Mesh(geo, mat)
        m.position.set(
          (Math.random() - 0.5) * BALANCE.layout.playfieldWidth,
          -5 - Math.random() * 3,
          (Math.random() - 0.5) * BALANCE.layout.playfieldHeight,
        )
        g.add(m)
      }
      this._layers.push(g)
      this.root.add(g)
    }
  }

  update(dt: number, playerZ: number): void {
    for (let i = 0; i < BALANCE.parallax.layers.length; i++) {
      const layer = BALANCE.parallax.layers[i]
      const g = this._layers[i]
      if (!layer || !g) continue
      g.position.z = (playerZ * layer.speed) % 20
    }
    void dt
  }

  dispose(): void {
    this.root.clear()
  }
}
