import { describe, expect, it, vi } from 'vitest'
import { decayFactor } from '../../core/math'
import { Layer } from '../../systems/layers'
import type { ColliderPort } from '../../systems/collision-manager'
import {
  collectPlasmaBlastPairs,
  isPlasmaOrb,
  type PlasmaBlastPort,
  type PlasmaBlastShotPort,
} from './plasma-detonate'

function enemy(x: number, z = 0): ColliderPort {
  return { layer: Layer.Enemy, active: true, x, z, radius: 0.5 }
}

function blastStub(overrides: Partial<PlasmaBlastPort> = {}): PlasmaBlastPort & {
  hits: ColliderPort[]
} {
  const hits: ColliderPort[] = []
  return {
    active: true,
    x: 0,
    z: 0,
    currentRadius: () => 2.4,
    explosionDamage: () => 80,
    hasHit(target) {
      return hits.includes(target)
    },
    markHit(target) {
      hits.push(target)
    },
    hits,
    ...overrides,
  }
}

function shotPort(): PlasmaBlastShotPort {
  return {
    layer: Layer.PlayerShot,
    active: true,
    x: 0,
    z: 0,
    radius: 0,
    effectiveDamage: () => 80,
  }
}

describe('isPlasmaOrb', () => {
  it('is true only when aoeRadius > 0', () => {
    expect(isPlasmaOrb({ aoeRadius: 2.4 })).toBe(true)
    expect(isPlasmaOrb({ aoeRadius: 0 })).toBe(false)
    expect(isPlasmaOrb({})).toBe(false)
  })
})

describe('collectPlasmaBlastPairs', () => {
  it('pairs newly overlapped hostiles once and does not consume the orb', () => {
    const target = enemy(1)
    const blast = blastStub()
    const query = { queryRadius: vi.fn(() => [target]) }
    const port = shotPort()
    const first = collectPlasmaBlastPairs(blast, query, port)
    expect(first).toHaveLength(1)
    expect(first[0]?.b).toBe(target)
    expect(first[0]?.aLayer).toBe(Layer.PlayerShot)
    expect(first[0]?.consumeProjectile).toBe(false)
    expect(port.radius).toBe(2.4)
    expect(blast.hits).toEqual([target])
    const second = collectPlasmaBlastPairs(blast, query, port)
    expect(second).toHaveLength(0)
  })

  it('skips resolve when nobody is inside the current radius', () => {
    const blast = blastStub()
    const query = { queryRadius: vi.fn(() => []) }
    expect(collectPlasmaBlastPairs(blast, query, shotPort())).toHaveLength(0)
  })

  it('skips an inactive blast or zero damage', () => {
    const query = { queryRadius: vi.fn(() => [enemy(0)]) }
    expect(collectPlasmaBlastPairs(blastStub({ active: false }), query, shotPort())).toHaveLength(0)
    expect(
      collectPlasmaBlastPairs(blastStub({ explosionDamage: () => 0 }), query, shotPort()),
    ).toHaveLength(0)
    expect(query.queryRadius).not.toHaveBeenCalled()
  })
})

describe('plasma blast rungs', () => {
  it('decayFactor quarters are 1 / 0.75 / 0.5 / 0.25', () => {
    expect(decayFactor(0)).toBe(1)
    expect(decayFactor(0.25)).toBe(1)
    expect(decayFactor(0.26)).toBe(0.75)
    expect(decayFactor(0.5)).toBe(0.75)
    expect(decayFactor(0.51)).toBe(0.5)
    expect(decayFactor(0.75)).toBe(0.5)
    expect(decayFactor(0.76)).toBe(0.25)
    expect(decayFactor(1)).toBe(0.25)
  })
})
