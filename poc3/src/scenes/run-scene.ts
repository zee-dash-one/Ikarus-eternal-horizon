import type { GameScene } from './game-scene.ts'
import type { GameRenderer } from '../render/renderer.ts'
import type { RunViewResources } from '../render/run-view-resources.ts'
import { CameraManager } from '../systems/camera-manager.ts'
import type { HudManager } from '../render/hud-manager.ts'
import type { WorldSnapshot } from '../core/world-snapshot.ts'
import { playfieldToWorld } from '../core/playfield.ts'

export interface RunSceneDeps {
  readonly renderer: GameRenderer
  readonly view: RunViewResources
  readonly hud: HudManager
  readonly getSnapshot: () => WorldSnapshot
  readonly getHighScore: () => number
}

/** Presentation only. Fixed gameplay and result submission are owned elsewhere. */
export class RunScene implements GameScene {
  readonly id = 'run'
  private readonly _camera = new CameraManager()
  private _lastTick = 0
  private _disposed = false
  constructor(private readonly _deps: RunSceneDeps) {}
  get snapshot(): WorldSnapshot { return this._deps.getSnapshot() }
  mount(): void {
    if (!this._deps.view.ready) throw new Error('Mundo ainda não preparado.')
    this._deps.renderer.scene.add(this._deps.view.root)
  }
  update(): void { /* No gameplay authority in View. */ }
  setFreeCam(enabled: boolean): void { this._camera.setFreeCam(enabled) }
  updateCameraControls(moveX: number, moveZ: number, dt: number): void {
    this._camera.updateFreeCam(moveX, moveZ, 0, dt)
  }
  syncRender(): void {
    if (this._disposed) return
    const snapshot = this.snapshot
    const pose = snapshot.player
    const world = playfieldToWorld(pose)
    const { craft, rings, shots, parallax } = this._deps.view
    const dt = Math.max(0, snapshot.tick - this._lastTick) / 60
    this._lastTick = snapshot.tick
    craft.syncPose(world.x, world.y, world.z, pose.rotY, pose.bank)
    rings.syncWorldPosition(world.x, world.y, world.z)
    rings.applyOrientation()
    rings.sync(snapshot.summary)
    shots.syncShots(snapshot.shots ?? [])
    this._deps.view.encounter.sync(snapshot)
    this._camera.updateFollow(pose, dt)
    this._deps.renderer.syncCamera(this._camera.state)
    parallax.update(dt, this._deps.renderer.camera)
    parallax.syncRender()
    this._deps.renderer.render()
    this._deps.hud.syncRender(snapshot, {
      activeWeapon: snapshot.activeWeapon ?? 'laser', weaponLevel: snapshot.weaponLevel ?? snapshot.summary.LVL,
      highScore: this._deps.getHighScore(), craftPct: snapshot.crafting?.progress ?? null, craftName: snapshot.crafting?.name ?? null,
    }, { camera: this._deps.renderer.camera, canvas: this._deps.renderer.canvas }, dt)
  }
  refreshCraftRings(): void { this._deps.view.rings.invalidateLayout() }
  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this._deps.hud.setVisible(false)
    this._deps.view.dispose()
  }
}
