export const DEG2RAD = Math.PI / 180

export interface Vec3 {
  x: number
  y: number
  z: number
}

export const scratchVec3A: Vec3 = { x: 0, y: 0, z: 0 }
export const scratchVec3B: Vec3 = { x: 0, y: 0, z: 0 }

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Exponential damp toward target (POC2 port). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target
  }
  return current + Math.sign(target - current) * maxDelta
}

export function lengthXZ(x: number, z: number): number {
  return Math.hypot(x, z)
}

export function normalizeXZ(x: number, z: number, out: Vec3): Vec3 {
  const len = lengthXZ(x, z)
  if (len <= 1e-6) {
    out.x = 0
    out.z = 0
    return out
  }
  out.x = x / len
  out.z = z / len
  return out
}

export function isOffField(
  x: number,
  z: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  margin: number,
): boolean {
  return (
    x < minX - margin ||
    x > maxX + margin ||
    z < minZ - margin ||
    z > maxZ + margin
  )
}
