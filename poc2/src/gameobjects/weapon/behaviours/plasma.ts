/**
 * SDD-D04 PlasmaBehaviour — slow orbs via E04 acquire. Each orb detonates on
 * impact (F01 splash + burst VFX). Volley size is explosionFoci (1 / 3 / 5).
 */

import type { ShotSpawn } from '../../shot/weapon-shot'
import type { WeaponConfig } from '../catalog'
import { registerWeapon } from '../registry'
import type { BehaviourCtx, ShotAcquirePort, ShotHandle, WeaponBehaviour } from '../registry'

const MAX_FOCI = 8

export class PlasmaBehaviour implements WeaponBehaviour {
  private cooldown = 0
  private readonly _batch: ShotHandle[] = new Array(MAX_FOCI)

  constructor(
    private readonly config: WeaponConfig,
    private readonly shots: ShotAcquirePort,
  ) {
    if (!config.orb) {
      throw new Error(`plasma weapon ${config.id} missing orb spec`)
    }
  }

  update(ctx: BehaviourCtx): void {
    const spec = this.config.orb
    if (!spec) {
      return
    }
    this.cooldown -= ctx.dt
    if (!ctx.holding || this.cooldown > 0) {
      return
    }

    const needed = Math.max(1, Math.min(MAX_FOCI, Math.round(spec.explosionFoci)))
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

    const range = spec.speed * spec.lifetime
    const damage = this.config.damage * ctx.mods.damageMul
    const aoeRadius = spec.aoeRadius * ctx.mods.aoeMul
    const spread = spec.forwardSpread

    for (let i = 0; i < needed; i++) {
      const bolt = this._batch[i]
      if (!bolt) {
        continue
      }
      const offX = needed === 1 ? 0 : (i - (needed - 1) / 2) * (spread / (needed - 1))
      const spawn: ShotSpawn = {
        x: ctx.muzzle.x + offX,
        z: ctx.muzzle.z,
        vx: 0,
        vz: -spec.speed,
        damage,
        lifetime: spec.lifetime,
        totalLifetime: spec.lifetime,
        radius: spec.radius,
        aoeRadius,
        aoeDuration: spec.aoeDuration,
        range,
        decayPerUnit: spec.damageDecayPerUnit,
        color: this.config.color,
      }
      bolt.activate(spawn)
    }

    this.cooldown = 1 / (this.config.rate * ctx.mods.rateMul)
  }

  dispose(): void {
    /* no GPU — E04 owns the pool */
  }
}

export function registerPlasma(): void {
  registerWeapon('plasma', (config, shots) => new PlasmaBehaviour(config, shots))
}

registerPlasma()
