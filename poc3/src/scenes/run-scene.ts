import { AmbientLight, DirectionalLight } from 'three'
import type { GameScene } from './game-scene.ts'
import type { GameRenderer } from '../render/renderer.ts'
import { ParallaxField } from '../render/parallax-field.ts'
import { PlayerCraftView } from '../render/player-craft-view.ts'
import type { GameLoop } from '../core/game-loop.ts'
import type { InputManager } from '../systems/input-manager.ts'
import type { PlayerManager } from '../systems/player-manager.ts'
import type { CameraManager } from '../systems/camera-manager.ts'
import type { EnergyManager } from '../systems/energy-manager.ts'
import type { CharSheetManager } from '../systems/char-sheet-manager.ts'
import {
  createEmptyWorldSnapshot,
  type WorldSnapshot,
} from '../core/world-snapshot.ts'

export interface RunSceneDeps {
  readonly renderer: GameRenderer
  readonly loop: GameLoop
  readonly input: InputManager
  readonly player: PlayerManager
  readonly camera: CameraManager
  readonly energy: EnergyManager
  readonly sheet: CharSheetManager
  readonly onPause: () => void
}

export class RunScene implements GameScene {
  readonly id = 'run'
  private readonly _deps: RunSceneDeps
  private readonly _parallax: ParallaxField
  private readonly _craft: PlayerCraftView
  private _snapshot: WorldSnapshot = createEmptyWorldSnapshot()
  private _elapsed = 0
  private _tick = 0

  constructor(deps: RunSceneDeps) {
    this._deps = deps
    this._parallax = new ParallaxField()
    this._craft = new PlayerCraftView()
  }

  get snapshot(): WorldSnapshot {
    return this._snapshot
  }

  mount(): void {
    const scene = this._deps.renderer.scene
    scene.add(this._parallax.root)
    scene.add(this._craft.root)
    if (!scene.children.some((c) => c.type === 'AmbientLight')) {
      scene.add(new AmbientLight(0xffffff, 0.6))
      scene.add(new DirectionalLight(0xffffff, 0.8))
    }
  }

  update(dt: number): void {
    if (this._deps.loop.paused) {
      return
    }
    this._deps.input.update()
    if (this._deps.input.wasPressed('Start')) {
      this._deps.onPause()
      return
    }
    this._tick += 1
    this._elapsed += dt
    this._deps.player.updateSim(dt)
    this._deps.energy.updateSim(dt)
    const pose = this._deps.player.pose
    this._deps.camera.updateFollow(pose, dt)
    if (this._deps.camera.freeCamEnabled) {
      this._deps.camera.updateFreeCam(
        this._deps.input.axis('moveX'),
        this._deps.input.axis('moveZ'),
        0,
        dt,
      )
    }
    this._parallax.update(dt, pose.z)
    const s = this._deps.sheet.summary
    this._snapshot = {
      tick: this._tick,
      paused: this._deps.loop.paused,
      player: { ...pose },
      summary: {
        ENE: s.ENE,
        SHD: s.SHD,
        DEF: s.DEF,
        MIT: s.MIT,
        SPD: s.SPD,
        S_D: s.S_D,
        S_R: s.S_R,
        REG: s.REG,
        LVL: s.LVL,
        HP: s.HP,
        integrityState: s.integrityState,
      },
      elapsedSec: this._elapsed,
      kills: 0,
      score: 0,
    }
  }

  syncRender(): void {
    const pose = this._deps.player.pose
    this._craft.syncPose(pose.x, 0, pose.z, pose.rotY, pose.bank)
    this._deps.renderer.syncCamera(this._deps.camera.state)
    this._deps.renderer.render()
  }

  dispose(): void {
    this._parallax.dispose()
    this._craft.dispose()
  }
}
