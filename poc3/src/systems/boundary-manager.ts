import { BALANCE } from '../core/balancer.ts'
import { isOffField } from '../core/math.ts'

export interface Recyclable {
  readonly x: number
  readonly z: number
  release(): void
}

export class BoundaryManager {
  isOffField(x: number, z: number): boolean {
    const w = BALANCE.world
    return isOffField(x, z, w.minX, w.maxX, w.minZ, w.maxZ, w.despawnMargin)
  }

  tryRecycle(entity: Recyclable): boolean {
    if (this.isOffField(entity.x, entity.z)) {
      entity.release()
      return true
    }
    return false
  }
}
