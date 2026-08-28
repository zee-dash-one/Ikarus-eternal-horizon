import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { BALANCE } from '../core/balancer.ts'

export class PlayerCraftView {
  readonly root: Group

  constructor() {
    this.root = new Group()
    const body = new Mesh(
      new BoxGeometry(1.2, 0.4, 1.8),
      new MeshStandardMaterial({ color: BALANCE.player.craftColor }),
    )
    body.position.y = 0.2
    this.root.add(body)
    const mountNames = [
      'Primary_Weapon',
      'Secondary_Weapon',
      'Dash',
      'Engine',
    ]
    for (const name of mountNames) {
      const mount = new Group()
      mount.name = name
      this.root.add(mount)
    }
  }

  syncPose(x: number, y: number, z: number, rotY: number, bank: number): void {
    this.root.position.set(x, y, z)
    this.root.rotation.set(0, rotY, bank)
  }

  dispose(): void {
    this.root.clear()
  }
}
