import { BALANCE } from '../core/balancer.ts'
import { DEG2RAD } from '../core/math.ts'
import { FollowBoxSim } from '../core/follow-box.ts'
import type { PlayerPose } from '../core/world-snapshot.ts'

export interface CameraState {
  x: number
  y: number
  z: number
  rotX: number
  rotY: number
  rotZ: number
}

export class CameraManager {
  private readonly _follow = new FollowBoxSim()
  private _freeCam = false
  private _freePose = {
    x: BALANCE.camera.position.x,
    y: BALANCE.camera.position.y,
    z: BALANCE.camera.position.z,
    rotX: BALANCE.camera.rotation.x,
    rotY: BALANCE.camera.rotation.y,
    rotZ: BALANCE.camera.rotation.z,
  }
  private _gizmosEnabled = false
  private readonly _state: CameraState = {
    x: BALANCE.camera.position.x,
    y: BALANCE.camera.position.y,
    z: BALANCE.camera.position.z,
    rotX: BALANCE.camera.rotation.x * DEG2RAD,
    rotY: BALANCE.camera.rotation.y * DEG2RAD,
    rotZ: BALANCE.camera.rotation.z * DEG2RAD,
  }

  get state(): Readonly<CameraState> {
    return this._state
  }

  get freeCamEnabled(): boolean {
    return this._freeCam
  }

  get gizmosEnabled(): boolean {
    return this._gizmosEnabled
  }

  setFreeCam(enabled: boolean): void {
    this._freeCam = enabled
  }

  setGizmosEnabled(enabled: boolean): void {
    this._gizmosEnabled = enabled
  }

  updateFollow(player: PlayerPose, dt: number): void {
    if (this._freeCam) {
      return
    }
    this._follow.update(player.x, player.z, dt)
    const cam = BALANCE.camera
    this._state.x = this._follow.cameraX
    this._state.y = cam.position.y
    this._state.z = this._follow.cameraZ
    this._state.rotX = cam.rotation.x * DEG2RAD
    this._state.rotY = cam.rotation.y * DEG2RAD
    this._state.rotZ = cam.rotation.z * DEG2RAD
  }

  updateFreeCam(
    moveX: number,
    moveZ: number,
    moveY: number,
    dt: number,
    speed = BALANCE.player.motion.maxSpeed,
  ): void {
    if (!this._freeCam) {
      return
    }
    this._freePose.x += moveX * speed * dt
    this._freePose.y += moveY * speed * dt
    this._freePose.z += moveZ * speed * dt
    this._state.x = this._freePose.x
    this._state.y = this._freePose.y
    this._state.z = this._freePose.z
    this._state.rotX = this._freePose.rotX * DEG2RAD
    this._state.rotY = this._freePose.rotY * DEG2RAD
    this._state.rotZ = this._freePose.rotZ * DEG2RAD
  }
}
