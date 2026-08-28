import type { GameScene } from './game-scene.ts'
import type { GameRenderer } from '../render/renderer.ts'
import { ParallaxField } from '../render/parallax-field.ts'
import { PlayerCraftView } from '../render/player-craft-view.ts'
import { CraftRingsMesh } from '../render/craft-rings-mesh.ts'
import { ShotFieldView } from '../render/shot-field-view.ts'
import { HudManager } from '../render/hud-manager.ts'
import { BALANCE } from '../core/balancer.ts'
import type { GameLoop } from '../core/game-loop.ts'
import type { InputManager } from '../systems/input-manager.ts'
import type { PlayerManager } from '../systems/player-manager.ts'
import type { CameraManager } from '../systems/camera-manager.ts'
import type { EnergyManager } from '../systems/energy-manager.ts'
import type { CharSheetManager } from '../systems/char-sheet-manager.ts'
import type { FiringManager } from '../systems/firing-manager.ts'
import type { ShotManager } from '../systems/shot-manager.ts'
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
  readonly firing: FiringManager
  readonly shots: ShotManager
  readonly hud: HudManager
  readonly onPause: () => void
}

export class RunScene implements GameScene {
  readonly id = 'run'
  private readonly _deps: RunSceneDeps
  private readonly _parallax: ParallaxField
  private readonly _craft: PlayerCraftView
  private readonly _rings: CraftRingsMesh
  private readonly _shotView: ShotFieldView
  private _snapshot: WorldSnapshot = createEmptyWorldSnapshot()
  private _elapsed = 0
  private _tick = 0

  constructor(deps: RunSceneDeps) {
    this._deps = deps
    this._parallax = new ParallaxField()
    this._craft = new PlayerCraftView()
    this._rings = new CraftRingsMesh()
    this._shotView = new ShotFieldView()
  }

  get snapshot(): WorldSnapshot {
    return this._snapshot
  }

  mount(): void {
    const scene = this._deps.renderer.scene
    scene.add(this._parallax.root)
    scene.add(this._shotView.root)
    scene.add(this._craft.root)
    scene.add(this._rings.root)
  }

  update(dt: number): void {
    if (this._deps.loop.paused) {
      return
    }
    this._deps.input.update()
    const scheme = this._deps.input.scheme
    if (scheme === 'gamepad' || scheme === 'touch') {
      if (this._deps.input.wasPressed('Start')) {
        this._deps.onPause()
        return
      }
    }
    this._tick += 1
    this._elapsed += dt
    this._deps.player.updateSim(dt)
    this._deps.firing.updateSim(dt, { x: this._deps.player.pose.x, z: this._deps.player.pose.z })
    this._deps.sheet.shipStatus.tick(dt * 1000)
    this._deps.energy.updateSim(dt)
    const pose = this._deps.player.pose
    this._deps.shots.updateSim(dt)
    this._deps.camera.updateFollow(pose, dt)
    if (this._deps.camera.freeCamEnabled) {
      this._deps.camera.updateFreeCam(
        this._deps.input.axis('moveX'),
        this._deps.input.axis('moveZ'),
        0,
        dt,
      )
    }
    this._parallax.update(dt, this._deps.renderer.camera)
    const s = this._deps.sheet.summary
    const score = Math.floor(this._elapsed * 120)
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
        integrityMax: s.integrity_max,
        eneMax: BALANCE.sheet.playerDefaults.ENE_max,
        shdMax: BALANCE.sheet.playerDefaults.SHD_max,
        integrityState: s.integrityState,
      },
      elapsedSec: this._elapsed,
      kills: 0,
      score,
    }
  }

  syncRender(): void {
    const pose = this._deps.player.pose
    this._craft.syncPose(pose.x, 0, pose.z, pose.rotY, pose.bank)
    this._rings.syncWorldPosition(pose.x, 0, pose.z)
    this._rings.applyOrientation()
    this._rings.sync(this._snapshot.summary)
    this._shotView.syncShots(this._deps.shots.activeShots)
    this._deps.renderer.syncCamera(this._deps.camera.state)
    this._parallax.syncRender()
    this._deps.renderer.render()
    this._deps.hud.syncRender(
      this._snapshot,
      {
        activeWeapon: this._deps.firing.activeWeapon,
        weaponLevel: this._deps.sheet.summary.LVL,
        highScore: HudManager.readHighScore(),
        craftPct: null,
        craftName: null,
      },
      {
        camera: this._deps.renderer.camera,
        canvas: this._deps.renderer.canvas,
      },
    )
  }

  refreshCraftRings(): void {
    const pose = this._deps.player.pose
    this._rings.syncWorldPosition(pose.x, 0, pose.z)
    this._rings.invalidateLayout()
    this._rings.applyOrientation()
    this._rings.sync(this._snapshot.summary)
  }

  dispose(): void {
    this._deps.hud.setVisible(false)
    this._parallax.dispose()
    this._parallax.root.removeFromParent()
    this._shotView.dispose()
    this._shotView.root.removeFromParent()
    this._rings.dispose()
    this._rings.root.removeFromParent()
    this._craft.dispose()
    this._craft.root.removeFromParent()
  }
}
