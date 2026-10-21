import { it, expect, vi } from 'vitest'
import { StartScene } from './start-scene.ts'
import { AssetManager } from '../systems/asset-manager.ts'
import { SoundManager } from '../systems/sound-manager.ts'
import type { GameRenderer } from '../render/renderer.ts'

it('waits for an explicit Start gesture, unlocks audio once and ignores stale activation', () => {
  const sound = new SoundManager(), assets = new AssetManager(), onStart = vi.fn()
  const scene = new StartScene({ assets, sound, onStart, renderer: {} as GameRenderer })
  scene.mount()
  for (let i = 0; i < 120; i++) scene.update()
  expect(onStart).not.toHaveBeenCalled()
  expect(sound.log).toEqual([])
  scene.tryStart(); scene.tryStart()
  expect(onStart).toHaveBeenCalledOnce()
  expect(sound.log).toEqual(['welcome_screen_ready'])
  scene.dispose(); scene.tryStart()
  expect(onStart).toHaveBeenCalledOnce()
  expect(assets.get('cockpit')?.ready).toBe(true)
})
