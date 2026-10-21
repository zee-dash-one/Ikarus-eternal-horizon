/** Logical POC3 plane is X/Z. Right = +X; up/forward = -Z. Y is visual height. */
export interface PlayfieldPoint { readonly x: number; readonly z: number }
export function playfieldToWorld(point: PlayfieldPoint, height = 0): { x: number; y: number; z: number } {
  return { x: point.x, y: height, z: point.z }
}
export function worldToPlayfield(point: { readonly x: number; readonly z: number }): PlayfieldPoint {
  return { x: point.x, z: point.z }
}
