/**
 * SDD-D02 LaserBehaviour — forward + diagonal volleys into E04 ShotAcquirePort.
 *
 * Cadence follows `config.rate` (gap = 1 / (rate * rateMul) between volleys).
 * After `laser.burstShots` uninterrupted volleys, `laser.overheatSec` cools
 * the barrel. Releasing fire resets the burst count (a pause breaks the streak).
 *
 * A volley is all-or-nothing: if the pool cannot cover every bolt in the fan,
 * nothing fires (prevents one-sided / "level dropped" patterns).
 */

import type { SoundPort } from '../../../audio/sound-manager'
import { DEG2RAD } from '../../../core/math'
import type { ShotSpawn } from '../../shot/weapon-shot'
import type { WeaponConfig } from '../catalog'
import { registerWeapon } from '../registry'
import type { BehaviourCtx, ShotAcquirePort, ShotHandle, WeaponBehaviour } from '../registry'

const MAX_VOLLEY = 32

export class LaserBehaviour implements WeaponBehaviour {
  private _cooldown = 0
  private _burstCount = 0
  private _overheat = 0
  private readonly _batch: ShotHandle[] = new Array(MAX_VOLLEY)

  constructor(
    private readonly config: WeaponConfig,
    private readonly shots: ShotAcquirePort,
    private readonly sound?: SoundPort,
  ) {
    if (!config.projectile || !config.laser) {
      throw new Error(`laser weapon ${config.id} missing projectile/laser spec`)
    }
  }

  /**
   * Soft overheat cue — SoundManager owns playback. Howler is post-G1;
   * missing sound is a silent no-op so unit tests need no world.
   */
  playOverheatCue(): void {
    this.sound?.playOverheatCue()
  }

  update(ctx: BehaviourCtx): void {
    if (this._overheat > 0) {
      this._overheat -= ctx.dt
      if (this._overheat <= 0) {
        this._overheat = 0
        this._burstCount = 0
        this._cooldown = 0
      }
      return
    }

    this._cooldown -= ctx.dt

    if (!ctx.holding) {
      this._burstCount = 0
      return
    }

    if (this._cooldown > 0) {
      return
    }

    const spec = this.config.projectile
    const lspec = this.config.laser
    if (!spec || !lspec) {
      return
    }

    const needed = lspec.forwardShots + 2 * lspec.diagonalShotsPerSide
    if (needed <= 0 || needed > MAX_VOLLEY) {
      return
    }

    const cost = this.config.energyPerShot * ctx.mods.energyMul
    if (!ctx.services.energy.canAfford(cost)) {
      return
    }

    let got = 0
    for (let i = 0; i < needed; i++) {
      const shot = this.shots.acquire()
      if (!shot) {
        for (let j = 0; j < got; j++) {
          const held = this._batch[j]
          if (held) {
            this.shots.release(held)
          }
        }
        return
      }
      this._batch[i] = shot
      got = i + 1
    }

    ctx.services.energy.spend(cost)

    const speed = spec.speed
    const range = spec.speed * spec.lifetime
    const damage = this.config.damage * ctx.mods.damageMul
    const forward = lspec.forwardShots
    let slot = 0

    for (let i = 0; i < forward; i++) {
      const offX =
        forward === 1 ? 0 : (i - (forward - 1) / 2) * (lspec.forwardSpread / (forward - 1))
      const bolt = this._batch[slot]
      if (bolt) {
        this.spawn(bolt, spec, range, damage, ctx.muzzle.x + offX, 0, -speed, ctx.muzzle.z)
      }
      slot += 1
    }

    slot = this.spawnDiagonals(ctx, spec, range, damage, speed, lspec, -1, slot)
    this.spawnDiagonals(ctx, spec, range, damage, speed, lspec, 1, slot)

    this._burstCount += 1
    const limit = Math.max(1, lspec.burstShots)
    if (this._burstCount >= limit) {
      this._overheat = Math.max(0, lspec.overheatSec)
      this._burstCount = 0
      this._cooldown = 0
      this.playOverheatCue()
    } else {
      const rate = Math.max(0.05, this.config.rate * ctx.mods.rateMul)
      this._cooldown = 1 / rate
    }
  }

  dispose(): void {
    /* no GPU — E04 owns the pool */
  }

  private spawnDiagonals(
    ctx: BehaviourCtx,
    spec: NonNullable<WeaponConfig['projectile']>,
    range: number,
    damage: number,
    speed: number,
    lspec: NonNullable<WeaponConfig['laser']>,
    sign: number,
    slot: number,
  ): number {
    const perSide = lspec.diagonalShotsPerSide
    for (let j = 0; j < perSide; j++) {
      const jitter = perSide === 1 ? 0 : (j - (perSide - 1) / 2) * lspec.diagonalSpreadDeg
      const deg = sign * lspec.diagonalAngleDeg + jitter
      const rad = deg * DEG2RAD
      const offX =
        perSide === 1 ? 0 : (j - (perSide - 1) / 2) * (lspec.forwardSpread / (perSide - 1))
      const bolt = this._batch[slot]
      if (bolt) {
        this.spawn(
          bolt,
          spec,
          range,
          damage,
          ctx.muzzle.x + offX,
          Math.sin(rad) * speed,
          -Math.cos(rad) * speed,
          ctx.muzzle.z,
        )
      }
      slot += 1
    }
    return slot
  }

  private spawn(
    shot: ShotHandle,
    spec: NonNullable<WeaponConfig['projectile']>,
    range: number,
    damage: number,
    x: number,
    vx: number,
    vz: number,
    z: number,
  ): void {
    const spawn: ShotSpawn = {
      x,
      z,
      vx,
      vz,
      damage,
      lifetime: spec.lifetime,
      totalLifetime: spec.lifetime,
      radius: spec.radius,
      aoeRadius: 0,
      range,
      decayPerUnit: spec.damageDecayPerUnit,
      color: this.config.color,
    }
    shot.activate(spawn)
  }
}

export function registerLaser(): void {
  registerWeapon('laser', (config, shots, deps) => new LaserBehaviour(config, shots, deps?.sound))
}

registerLaser()
