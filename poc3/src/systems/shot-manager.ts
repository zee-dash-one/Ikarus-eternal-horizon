import { BALANCE } from '../core/balancer.ts'
import { PlayerShot } from '../core/player-shot.ts'
import { ObjectPool } from '../pools/object-pool.ts'
import { BoundaryManager } from './boundary-manager.ts'

export class ShotManager {
  onExpire: ((shot: PlayerShot) => void) | null = null
  private readonly _pool: ObjectPool<PlayerShot>
  private readonly _active: PlayerShot[] = []
  private _sequence = 0
  private readonly _bounds = new BoundaryManager()

  constructor() {
    const cap = BALANCE.weapons.laser.poolSize
    this._pool = new ObjectPool(() => new PlayerShot(), cap, cap)
  }

  get activeShots(): readonly PlayerShot[] {
    return this._active
  }

  acquire(): PlayerShot | null {
    const shot = this._pool.acquire()
    if (!shot) {
      return null
    }
    shot.id = ++this._sequence
    this._active.push(shot)
    return shot
  }

  release(shot: PlayerShot): void {
    const idx = this._active.indexOf(shot)
    if (idx >= 0) {
      this._active.splice(idx, 1)
    }
    shot.reset()
    this._pool.release(shot)
  }

  updateSim(dt: number): void {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const shot = this._active[i]
      if (!shot) {
        continue
      }
      shot.updateSim(dt)
      if (!shot.active) {
        this.onExpire?.(shot)
        this.release(shot)
        continue
      }
      if (this._bounds.isOffField(shot.x, shot.z)) {
        this.release(shot)
      }
    }
  }
}
