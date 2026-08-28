import { BALANCE } from '../core/balancer.ts'
import { clamp, lerp } from '../core/math.ts'
import type { PlayerPose } from '../core/world-snapshot.ts'

export interface CameraState {
  x: number
  y: number
  z: number
  lookX: number
  lookY: number
  lookZ: number
}

export class CameraManager {
  private _targetX = 0
  private _targetZ = 0
  private _camX = 0
  private _camZ = 0
  private _freeCam = false
  private _freeX = 0
  private _freeY = 18
  private _freeZ = 24
  private _gizmosEnabled = false
  private readonly _state: CameraState = {
    x: 0,
    y: 18,
    z: 24,
    lookX: 0,
    lookY: 0,
    lookZ: 0,
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
    const box = BALANCE.followBox
    const dx = player.x - this._targetX
    const dz = player.z - this._targetZ
    if (Math.abs(dx) > box.halfWidth) {
      this._targetX += (Math.abs(dx) - box.halfWidth) * Math.sign(dx) * box.bounceStrength
    }
    if (Math.abs(dz) > box.halfHeight) {
      this._targetZ += (Math.abs(dz) - box.halfHeight) * Math.sign(dz) * box.bounceStrength
    }
    const speed = box.recenterSpeed * dt
    this._camX = lerp(this._camX, this._targetX, clamp(speed, 0, 1))
    this._camZ = lerp(this._camZ, this._targetZ, clamp(speed, 0, 1))

    const cam = BALANCE.camera
    this._state.x = this._camX + cam.position.x
    this._state.y = cam.position.y
    this._state.z = this._camZ + cam.position.z
    this._state.lookX = this._camX
    this._state.lookY = 0
    this._state.lookZ = this._camZ
  }

  updateFreeCam(
    moveX: number,
    moveZ: number,
    moveY: number,
    dt: number,
    speed = 12,
  ): void {
    if (!this._freeCam) {
      return
    }
    this._freeX += moveX * speed * dt
    this._freeY += moveY * speed * dt
    this._freeZ += moveZ * speed * dt
    this._state.x = this._freeX
    this._state.y = this._freeY
    this._state.z = this._freeZ
    this._state.lookX = this._freeX
    this._state.lookY = 0
    this._state.lookZ = this._freeZ - 10
  }
}
