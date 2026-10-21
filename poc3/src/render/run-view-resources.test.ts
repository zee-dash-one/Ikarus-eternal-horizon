import { expect, it, vi } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import { RunViewResources } from './run-view-resources.ts'
import { Points } from 'three'

it('allocates exactly three layers, warms a detached graph and keeps staged meshes hidden', () => {
  const compile = vi.fn((root) => { expect(root.parent).toBeNull() })
  const view = new RunViewResources(BALANCE.parallax.layers, compile)
  expect(view.layerCount).toBe(3)
  expect(view.ready).toBe(false)
  view.warmup({ enemies: [{ id: 'e1', archetypeId: 'maldroid-fighter', factionId: 'maldroid-patrol', class: 'Warrior', squadId: 'q', formation: 'V', slot: 0, spawnPointId: 'enemy-left', position: { x: -100, z: -180 }, direction: { x: 0, z: 1 }, offsetTicks: 0 }], asteroids: [{ id: 'a1', tick: 60, size: 'L', spawnPointId: 'asteroid-right', position: { x: 180, z: -180 }, velocity: { x: 0, z: 6 } }] })
  expect(compile).toHaveBeenCalledOnce()
  expect(view.ready).toBe(true)
  expect(view.stagedMeshCount).toBe(2)
  expect(view.root.getObjectByName('inactive-first-encounter')?.visible).toBe(false)
  expect(view.root.parent).toBeNull()
  const dispose = vi.spyOn(view.parallax, 'dispose')
  view.dispose(); view.dispose()
  expect(dispose).toHaveBeenCalledOnce()
  expect(view.ready).toBe(false)
  expect(view.stagedMeshCount).toBe(0)
})

it('reproduces cosmetics from their own seed and isolates each parallax layer', () => {
  const a = new RunViewResources(BALANCE.parallax.layers, () => {}, BALANCE.preparation.visuals, 'cosmetic-seed')
  const layers = BALANCE.parallax.layers.map((layer, index) => index === 0 ? { ...layer, count: 1 } : layer)
  const b = new RunViewResources(layers, () => {}, BALANCE.preparation.visuals, 'cosmetic-seed')
  function positions(view: RunViewResources, layer: number) {
    const points = view.parallax.layers[layer]?.group.children.find((child) => child instanceof Points)
    if (!(points instanceof Points)) throw new Error('Missing points')
    return Array.from(points.geometry.getAttribute('position').array)
  }
  expect(positions(a, 1)).toEqual(positions(b, 1))
  expect(positions(a, 2)).toEqual(positions(b, 2))
  a.dispose(); b.dispose()
})
