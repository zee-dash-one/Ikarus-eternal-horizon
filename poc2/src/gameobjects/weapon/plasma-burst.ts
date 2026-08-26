/**
 * SDD-D04 plasma impact burst — growing orange-yellow sphere, then fade.
 * Pooled; scene add/remove belongs to the manager (D14).
 */

import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
} from 'three'
import { clamp } from '../../core/math'
import { ObjectPool } from '../../pools/object-pool'

const SHARED_GEO = new SphereGeometry(1, 16, 12)

export interface PlasmaBurstSpawn {
  readonly x: number
  readonly z: number
  readonly maxRadius: number
  readonly duration: number
  readonly color: number
}

export class PlasmaBurst extends Mesh {
  active = false
  x = 0
  z = 0
  age = 0
  duration = 0.4
  maxRadius = 2.4

  private readonly _mat: MeshBasicMaterial

  constructor() {
    const mat = new MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    super(SHARED_GEO, mat)
    this._mat = mat
    this.visible = false
  }

  activate(spawn: PlasmaBurstSpawn): void {
    this.x = spawn.x
    this.z = spawn.z
    this.maxRadius = spawn.maxRadius
    this.duration = spawn.duration
    this.age = 0
    this._mat.color.setHex(spawn.color)
    this._mat.opacity = 0.85
    this.active = true
    this.visible = true
  }

  deactivate(): void {
    this.active = false
    this.visible = false
  }

  update(dt: number): void {
    if (!this.active) {
      return
    }
    this.age += dt
    if (this.age >= this.duration) {
      this.deactivate()
    }
  }

  syncRender(): void {
    if (!this.active) {
      this.visible = false
      return
    }
    const t = this.duration > 0 ? clamp(this.age / this.duration, 0, 1) : 1
    const radius = Math.max(0.01, this.maxRadius * t)
    this.position.set(this.x, 0, this.z)
    this.scale.set(radius, radius, radius)
    this._mat.opacity = 0.85 * (1 - t)
    this.visible = true
  }

  dispose(): void {
    this.deactivate()
    this._mat.dispose()
  }
}

export interface PlasmaBurstManagerOptions {
  readonly scene: Scene
  readonly capacity: number
  readonly color: number
}

export class PlasmaBurstManager {
  private readonly _color: number
  private readonly _pool: ObjectPool<PlasmaBurst>
  private readonly _releaseQueue: PlasmaBurst[] = []

  constructor(options: PlasmaBurstManagerOptions) {
    this._color = options.color
    const scene = options.scene
    this._pool = new ObjectPool<PlasmaBurst>({
      capacity: options.capacity,
      factory: () => {
        const burst = new PlasmaBurst()
        scene.add(burst)
        return burst
      },
      reset: (burst) => {
        burst.deactivate()
      },
      disposeItem: (burst) => {
        scene.remove(burst)
        burst.dispose()
      },
    })
  }

  spawn(x: number, z: number, maxRadius: number, duration: number): void {
    if (maxRadius <= 0 || duration <= 0) {
      return
    }
    const burst = this._pool.acquire()
    if (!burst) {
      return
    }
    burst.activate({
      x,
      z,
      maxRadius,
      duration,
      color: this._color,
    })
  }

  update(dt: number): void {
    this._releaseQueue.length = 0
    this._pool.forEachActive((burst) => {
      burst.update(dt)
      if (!burst.active) {
        this._releaseQueue.push(burst)
      }
    })
    for (let i = 0; i < this._releaseQueue.length; i++) {
      const burst = this._releaseQueue[i]
      if (burst) {
        this._pool.release(burst)
      }
    }
  }

  syncRender(): void {
    this._pool.forEachActive((burst) => {
      burst.syncRender()
    })
  }

  dispose(): void {
    this._pool.dispose()
  }
}
