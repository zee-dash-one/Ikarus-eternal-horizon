/**
 * SDD-D04 plasma blast pulse — expanding sphere hits each hostile once.
 * Damage rungs match A03 decayFactor (100 / 75 / 50 / 25 by quarter of duration).
 * Never calls applyDamage (F04 resolves the pairs).
 */

import type { ColliderPort, CollisionQuery, HitPair } from '../../systems/collision-manager'
import { Layer } from '../../systems/layers'
import type { ShotDamagePort } from '../../systems/damage-resolver'

export const PLASMA_BLAST_LAYERS: readonly Layer[] = [Layer.Enemy, Layer.Meteor]

const PAIR_SCRATCH: HitPair[] = []

export interface PlasmaAoeQuery {
  queryRadius(q: CollisionQuery): readonly ColliderPort[]
}

export interface PlasmaBlastPort {
  readonly active: boolean
  readonly x: number
  readonly z: number
  currentRadius(): number
  explosionDamage(): number
  hasHit(target: ColliderPort): boolean
  markHit(target: ColliderPort): void
}

export interface PlasmaBlastShotPort extends ColliderPort, ShotDamagePort {
  radius: number
  x: number
  z: number
}

export function isPlasmaOrb(shot: { aoeRadius?: number }): boolean {
  return typeof shot.aoeRadius === 'number' && shot.aoeRadius > 0
}

/**
 * First-contact pairs this frame: hostiles newly inside the current blast radius.
 * consumeProjectile is always false (the orb already died).
 */
export function collectPlasmaBlastPairs(
  blast: PlasmaBlastPort,
  colliders: PlasmaAoeQuery,
  shotPort: PlasmaBlastShotPort,
): readonly HitPair[] {
  if (!blast.active || blast.explosionDamage() <= 0) {
    PAIR_SCRATCH.length = 0
    return PAIR_SCRATCH
  }
  const radius = blast.currentRadius()
  shotPort.x = blast.x
  shotPort.z = blast.z
  shotPort.radius = radius
  const found = colliders.queryRadius({
    x: blast.x,
    z: blast.z,
    radius,
    hits: PLASMA_BLAST_LAYERS,
  })
  let n = 0
  for (let i = 0; i < found.length; i++) {
    const target = found[i]
    if (!target || !target.active || blast.hasHit(target)) {
      continue
    }
    blast.markHit(target)
    const existing = PAIR_SCRATCH[n] as
      | {
          a: ColliderPort
          b: ColliderPort
          aLayer: Layer
          bLayer: Layer
          consumeProjectile: boolean
        }
      | undefined
    if (existing) {
      existing.a = shotPort
      existing.b = target
      existing.aLayer = Layer.PlayerShot
      existing.bLayer = target.layer
      existing.consumeProjectile = false
    } else {
      PAIR_SCRATCH.push({
        a: shotPort,
        b: target,
        aLayer: Layer.PlayerShot,
        bLayer: target.layer,
        consumeProjectile: false,
      })
    }
    n += 1
  }
  PAIR_SCRATCH.length = n
  return PAIR_SCRATCH
}
