import { BoundaryManager } from './boundary-manager.ts'

/** Theme 5 stub — pooled shots recycle via RUL-02. */
export class ShotManager {
  private readonly _bounds = new BoundaryManager()

  updateSim(): void {
    void this._bounds
  }

  tryRecycle(entity: { x: number; z: number; release: () => void }): boolean {
    return this._bounds.tryRecycle(entity)
  }
}
