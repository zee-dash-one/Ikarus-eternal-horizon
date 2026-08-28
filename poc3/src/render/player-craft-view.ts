import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three'
import { BALANCE } from '../core/balancer.ts'
import { DEG2RAD } from '../core/math.ts'

/** POC2 ship silhouette — View only. */
export class PlayerCraftView {
  readonly root: Group
  private readonly _thruster: Mesh
  private _flickerTime = 0

  constructor() {
    this.root = new Group()
    const visual = BALANCE.player.visual
    const thruster = BALANCE.player.thruster

    const hullGeo = new BoxGeometry(visual.size.w, visual.size.h, visual.size.d)
    const hullMat = new MeshBasicMaterial({
      color: visual.wireframeColor,
      transparent: true,
      opacity: 0.95,
    })
    const hull = new Mesh(hullGeo, hullMat)
    hull.name = 'hull'
    this.root.add(hull)

    const accentGeo = new BoxGeometry(
      visual.size.w * 0.42,
      visual.size.h * 0.38,
      visual.size.d * 0.4,
    )
    const accentMat = new MeshBasicMaterial({
      color: visual.accentColor,
      transparent: true,
      opacity: 0.85,
    })
    const accent = new Mesh(accentGeo, accentMat)
    accent.name = 'accent'
    accent.position.set(0, visual.size.h * 0.42, -visual.size.d * 0.12)
    this.root.add(accent)

    const thrusterGeo = new ConeGeometry(thruster.width, thruster.length, 8)
    thrusterGeo.rotateX(Math.PI / 2)
    const thrusterMat = new MeshBasicMaterial({
      color: visual.thrusterColor,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    this._thruster = new Mesh(thrusterGeo, thrusterMat)
    this._thruster.position.set(0, thruster.position.y, visual.size.d / 2)
    this.root.add(this._thruster)

    const mountNames = ['Primary_Weapon', 'Secondary_Weapon', 'Dash', 'Engine']
    for (const name of mountNames) {
      const mount = new Group()
      mount.name = name
      this.root.add(mount)
    }
  }

  syncPose(x: number, y: number, z: number, _rotY: number, bankDeg: number): void {
    this.root.position.set(x, y, z)
    this.root.rotation.set(0, 0, bankDeg * DEG2RAD)
    this._flickerTime += 1 / 60
    const flicker =
      0.72 + 0.28 * Math.sin(this._flickerTime * 42) * Math.sin(this._flickerTime * 13 + 1.3)
    this._thruster.scale.set(1, flicker, 1)
  }

  dispose(): void {
    this.root.clear()
  }
}
