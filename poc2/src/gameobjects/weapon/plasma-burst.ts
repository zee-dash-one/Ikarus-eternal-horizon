/**
 * SDD-D04 plasma impact burst — growing orange-yellow sphere, then fade.
 * Hit radius matches the visual expansion. Each hostile is marked once.
 * Pooled; scene add/remove belongs to the manager (D14).
 */

import {
  AdditiveBlending,
  Mesh,
  MeshBasicMaterial,
  Scene,
  SphereGeometry,
} from 'three'
import { clamp, decayFactor } from '../../core/math'
import { ObjectPool } from '../../pools/object-pool'
import { Layer } from '../../systems/layers'
import type { ColliderPort } from '../../systems/collision-manager'
import type { DamageEvent, HitPairLike } from '../../systems/damage-resolver'
import {
  collectPlasmaBlastPairs,
  type PlasmaAoeQuery,
  type PlasmaBlastShotPort,
} from './plasma-detonate'

const SHARED_GEO = new SphereGeometry(1, 16, 12)
const HIT_CAP = 48

export interface PlasmaBurstSpawn {
  readonly x: number
  readonly z: number
  readonly maxRadius: number
  readonly duration: number
  readonly damage: number
  readonly color: number
}

export class PlasmaBurst extends Mesh {
  active = false
  x = 0
  z = 0
  age = 0
  duration = 0.4
  maxRadius = 2.4
  damage = 0

  private readonly _mat: MeshBasicMaterial
  private readonly _hit: ColliderPort[] = new Array(HIT_CAP)
  private _hitLen = 0

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
    this.damage = spawn.damage
    this.age = 0
    this._hitLen = 0
    this._mat.color.setHex(spawn.color)
    this._mat.opacity = 0.85
    this.active = true
    this.visible = true
  }

  deactivate(): void {
    this.active = false
    this.visible = false
    this._hitLen = 0
  }

  currentRadius(): number {
    return this.maxRadius * this._t()
  }

  explosionDamage(): number {
    return this.damage * decayFactor(this._t())
  }

  hasHit(target: ColliderPort): boolean {
    for (let i = 0; i < this._hitLen; i++) {
      if (this._hit[i] === target) {
        return true
      }
    }
    return false
  }

  markHit(target: ColliderPort): void {
    if (this._hitLen >= HIT_CAP) {
      return
    }
    this._hit[this._hitLen] = target
    this._hitLen += 1
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
    const t = this._t()
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

  private _t(): number {
    return this.duration > 0 ? clamp(this.age / this.duration, 0, 1) : 1
  }
}

export interface PlasmaBurstManagerOptions {
  readonly scene: Scene
  readonly capacity: number
  readonly color: number
}

export interface PlasmaBlastApply {
  (pairs: readonly HitPairLike[]): readonly DamageEvent[]
}

export class PlasmaBurstManager {
  private readonly _color: number
  private readonly _pool: ObjectPool<PlasmaBurst>
  private readonly _releaseQueue: PlasmaBurst[] = []
  private readonly _shotPort: PlasmaBlastShotPort = {
    layer: Layer.PlayerShot,
    active: true,
    x: 0,
    z: 0,
    radius: 0,
    effectiveDamage: () => this._shotDamage,
  }
  private _shotDamage = 0

  constructor(options: PlasmaBurstManagerOptions) {
    this._color = options.color
    const scene = options.scene
    ;(this._shotPort as ColliderPort & { __cid?: number }).__cid = -1
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

  spawn(x: number, z: number, maxRadius: number, duration: number, damage: number): void {
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
      damage,
      color: this._color,
    })
  }

  /**
   * Apply first-contact blast damage at the current radius, then advance age.
   * F04 resolve is injected so this class never calls applyDamage.
   */
  pulse(dt: number, colliders: PlasmaAoeQuery, apply: PlasmaBlastApply): void {
    this._releaseQueue.length = 0
    this._pool.forEachActive((burst) => {
      this._shotDamage = burst.explosionDamage()
      const pairs = collectPlasmaBlastPairs(burst, colliders, this._shotPort)
      if (pairs.length > 0) {
        apply(pairs)
      }
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

  update(dt: number): void {
    this.pulse(dt, { queryRadius: () => [] }, () => [])
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
