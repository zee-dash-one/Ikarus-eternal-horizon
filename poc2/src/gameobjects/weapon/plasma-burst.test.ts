import { AdditiveBlending, Mesh, Scene, SphereGeometry } from 'three'
import { describe, expect, it, vi } from 'vitest'
import { PlasmaBurst, PlasmaBurstManager } from './plasma-burst'

describe('PlasmaBurst', () => {
  it('grows from near-zero to maxRadius and fades over duration', () => {
    const burst = new PlasmaBurst()
    expect(burst).toBeInstanceOf(Mesh)
    expect(burst.geometry).toBeInstanceOf(SphereGeometry)
    burst.activate({ x: 2, z: -4, maxRadius: 2.4, duration: 0.4, color: 0xfbbf24 })
    burst.syncRender()
    expect(burst.position.x).toBe(2)
    expect(burst.position.z).toBe(-4)
    expect(burst.scale.x).toBeCloseTo(0.01)
    burst.update(0.2)
    burst.syncRender()
    expect(burst.scale.x).toBeCloseTo(1.2)
    expect(burst.active).toBe(true)
    burst.update(0.2)
    expect(burst.active).toBe(false)
    burst.dispose()
  })

  it('constructor does not scene.add', () => {
    const scene = new Scene()
    const addSpy = vi.spyOn(scene, 'add')
    const burst = new PlasmaBurst()
    expect(addSpy).not.toHaveBeenCalled()
    expect(burst.parent).toBeNull()
    addSpy.mockRestore()
    burst.dispose()
  })

  it('uses additive blending', () => {
    const burst = new PlasmaBurst()
    const mat = burst.material
    if (Array.isArray(mat)) {
      throw new Error('expected MeshBasicMaterial')
    }
    expect(mat.blending).toBe(AdditiveBlending)
    burst.dispose()
  })
})

describe('PlasmaBurstManager', () => {
  it('spawn writes a live burst; update expires it', () => {
    const scene = new Scene()
    const manager = new PlasmaBurstManager({ scene, capacity: 4, color: 0xfbbf24 })
    manager.spawn(1, -2, 2.4, 0.4)
    manager.syncRender()
    expect(scene.children.length).toBe(4)
    manager.update(0.4)
    manager.syncRender()
    manager.dispose()
  })

  it('skips spawn when radius or duration is 0', () => {
    const scene = new Scene()
    const manager = new PlasmaBurstManager({ scene, capacity: 2, color: 0xfbbf24 })
    manager.spawn(0, 0, 0, 0.4)
    manager.spawn(0, 0, 2, 0)
    manager.dispose()
  })
})
