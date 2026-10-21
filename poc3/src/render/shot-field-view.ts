import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { ShotSnapshot } from '../core/world-snapshot.ts'

/** Preallocated at preparation: projectile identity never allocates/disposes GPU resources. */
export class ShotFieldView {
  readonly root = new Group()
  private readonly _geometry = new SphereGeometry(1, 6, 6)
  private readonly _laser = new MeshBasicMaterial({ color: BALANCE.weapons.laser.color, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false })
  private readonly _plasma = new MeshBasicMaterial({ color: BALANCE.economy.profiles.plasma.color })
  private readonly _meshes: Mesh[] = []
  constructor() {
    this.root.name = 'shot-field'
    for (let i = 0; i < BALANCE.weapons.laser.poolSize; i++) {
      const mesh = new Mesh(this._geometry, this._laser); mesh.visible = false
      this._meshes.push(mesh); this.root.add(mesh)
    }
  }
  syncShots(shots: readonly ShotSnapshot[]): void {
    for (let i = 0; i < this._meshes.length; i++) {
      const mesh = this._meshes[i], shot = shots[i]
      if (!mesh) continue
      mesh.visible = !!shot
      if (!shot) continue
      mesh.position.set(shot.x, 0, shot.z)
      mesh.scale.setScalar(shot.radius ?? BALANCE.weapons.laser.radius)
      mesh.material = shot.weapon === 'plasma' ? this._plasma : this._laser
    }
  }
  dispose(): void { this._geometry.dispose(); this._laser.dispose(); this._plasma.dispose(); this.root.clear() }
}
