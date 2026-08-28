import {
  AdditiveBlending,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { PlayerShot } from '../core/player-shot.ts'

/** View sync for pooled player bolts. */
export class ShotFieldView {
  readonly root: Group
  private readonly _meshes = new Map<PlayerShot, Mesh>()

  constructor() {
    this.root = new Group()
    this.root.name = 'shot-field'
  }

  syncShots(shots: readonly PlayerShot[]): void {
    const live = new Set(shots)
    for (const [shot, mesh] of this._meshes) {
      if (!live.has(shot)) {
        mesh.visible = false
        this._meshes.delete(shot)
        this.root.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as MeshBasicMaterial).dispose()
      }
    }
    const laser = BALANCE.weapons.laser
    for (const shot of shots) {
      if (!shot.active) {
        continue
      }
      let mesh = this._meshes.get(shot)
      if (!mesh) {
        const geo = new SphereGeometry(laser.radius, 6, 6)
        const mat = new MeshBasicMaterial({
          color: laser.color,
          transparent: true,
          opacity: 0.95,
          blending: AdditiveBlending,
          depthWrite: false,
        })
        mesh = new Mesh(geo, mat)
        this._meshes.set(shot, mesh)
        this.root.add(mesh)
      }
      mesh.visible = true
      mesh.position.set(shot.x, 0, shot.z)
    }
  }

  dispose(): void {
    for (const mesh of this._meshes.values()) {
      mesh.geometry.dispose()
      ;(mesh.material as MeshBasicMaterial).dispose()
    }
    this._meshes.clear()
    this.root.clear()
  }
}
