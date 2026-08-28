import { Euler, Quaternion, Vector3 } from 'three'
import { BALANCE, type HudEulerDeg } from '../core/balancer.ts'
import { DEG2RAD } from '../core/math.ts'

const _up = new Vector3(0, 1, 0)
const _toCam = new Vector3()
const _quat = new Quaternion()
const _euler = new Euler(0, 0, 0, 'YXZ')

/** Ring normal (+Y) tilted toward BALANCE.camera.position — flat to initial view. */
export function ringRotationFacingCameraDeg(): HudEulerDeg {
  const pos = BALANCE.camera.position
  _toCam.set(pos.x, pos.y, pos.z)
  if (_toCam.lengthSq() <= 1e-8) {
    return { x: 0, y: 0, z: 0 }
  }
  _toCam.normalize()
  _quat.setFromUnitVectors(_up, _toCam)
  _euler.setFromQuaternion(_quat, 'YXZ')
  return {
    x: _euler.x / DEG2RAD,
    y: _euler.y / DEG2RAD,
    z: _euler.z / DEG2RAD,
  }
}

export function resolveHudRingRotationDeg(): HudEulerDeg {
  const rings = BALANCE.hud.rings
  const base = rings.autoRotationFromCamera
    ? ringRotationFacingCameraDeg()
    : { x: 0, y: 0, z: 0 }
  return {
    x: base.x + rings.rotation.x,
    y: base.y + rings.rotation.y,
    z: base.z + rings.rotation.z,
  }
}
