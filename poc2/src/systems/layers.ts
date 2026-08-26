/**
 * SDD-F01 / D13 — frozen six-layer set and who-hits-whom matrix (data, not if-branches).
 *
 * Bodies ram each other (mutual damage in F04). Shots hit bodies. Shots never hit shots.
 * Same layer never hits itself. Drop is collect-only (Player → Drop; F04 ignores it).
 *
 *            Player  PlayerShot  Enemy  EnemyShot  Meteor  Drop
 * Player        —         —        Y        —        Y      Y
 * PlayerShot    —         —        Y        —        Y      —
 * Enemy         Y         —        —        —        Y      —
 * EnemyShot     Y         —        —        —        Y      —
 * Meteor        Y         Y        Y        Y        —      —
 * Drop          —         —        —        —        —      —
 */

export enum Layer {
  Player = 0,
  PlayerShot = 1,
  Enemy = 2,
  EnemyShot = 3,
  Meteor = 4,
  Drop = 5,
}

export const BODY_LAYERS: readonly Layer[] = [Layer.Player, Layer.Enemy, Layer.Meteor]

export const SHOT_LAYERS: readonly Layer[] = [Layer.PlayerShot, Layer.EnemyShot]

/** Who-hits-whom DATA. Empty array = hits nothing. BALANCE.collision.hitMatrix points here. */
export const HIT_MATRIX: Readonly<Record<Layer, readonly Layer[]>> = {
  [Layer.Player]: [Layer.Enemy, Layer.Meteor, Layer.Drop],
  [Layer.PlayerShot]: [Layer.Enemy, Layer.Meteor],
  [Layer.Enemy]: [Layer.Player, Layer.Meteor],
  [Layer.EnemyShot]: [Layer.Player, Layer.Meteor],
  [Layer.Meteor]: [Layer.Player, Layer.Enemy, Layer.PlayerShot, Layer.EnemyShot],
  [Layer.Drop]: [],
}

export function isBodyLayer(layer: Layer): boolean {
  return layer === Layer.Player || layer === Layer.Enemy || layer === Layer.Meteor
}

export function isShotLayer(layer: Layer): boolean {
  return layer === Layer.PlayerShot || layer === Layer.EnemyShot
}

/** Ram damage from current hull / integrity. `frac` is BALANCE.collision.contactIntegrityFrac. */
export function contactDamageFromIntegrity(current: number, frac: number): number {
  if (current <= 0 || frac <= 0) {
    return 0
  }
  return current * frac
}

export function layersHit(
  from: Layer,
  to: Layer,
  matrix: Readonly<Record<Layer, readonly Layer[]>> = HIT_MATRIX,
): boolean {
  const row = matrix[from]
  for (let i = 0; i < row.length; i++) {
    if (row[i] === to) {
      return true
    }
  }
  return false
}
