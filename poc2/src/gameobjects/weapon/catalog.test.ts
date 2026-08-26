import { describe, expect, it } from 'vitest'
import { BALANCE } from '../../core/balancer'
import { WEAPONS } from './catalog'
import { LASER_LEVELS, PLASMA_LEVELS } from './weapon-levels'
import catalogSource from './catalog.ts?raw'

describe('WEAPONS catalog', () => {
  it('has laser projectile 30/2/0.12 and plasma orb 12/3/0.28/2.4', () => {
    expect(WEAPONS.laser.damage).toBe(LASER_LEVELS[0]?.damage)
    expect(WEAPONS.laser.rate).toBe(10)
    expect(WEAPONS.laser.energyPerShot).toBe(0.5)
    expect(WEAPONS.laser.projectile).toEqual({
      speed: 30,
      radius: 0.12,
      lifetime: 2,
      damageDecayPerUnit: 0,
    })
    expect(WEAPONS.laser.laser).toMatchObject({
      burstShots: 15,
      overheatSec: 0.5,
      diagonalAngleDeg: 15,
    })
    expect(WEAPONS.plasma.orb).toEqual({
      speed: 12,
      radius: 0.28,
      lifetime: 3,
      aoeRadius: 2.4,
      aoeDuration: 0.4,
      explosionFoci: 1,
      forwardSpread: 0.9,
      damageDecayPerUnit: 0,
    })
  })

  it('is the same object as BALANCE.weapons.catalog', () => {
    expect(BALANCE.weapons.catalog).toBe(WEAPONS)
  })

  it('L1 catalog stats match BALANCE.weapons.levels rows', () => {
    const laserL1 = BALANCE.weapons.levels.laser[0]
    expect(WEAPONS.laser.damage).toBe(laserL1?.damage)
    expect(WEAPONS.laser.rate).toBe(laserL1?.rate)
    expect(WEAPONS.laser.energyPerShot).toBe(laserL1?.energyPerShot)
    expect(WEAPONS.laser.projectile?.lifetime).toBe(laserL1?.lifetime)
    expect(BALANCE.weapons.levels.laser).toBe(LASER_LEVELS)
    const plasmaL1 = BALANCE.weapons.levels.plasma[0]
    expect(WEAPONS.plasma.damage).toBe(plasmaL1?.damage)
    expect(WEAPONS.plasma.rate).toBe(plasmaL1?.rate)
    expect(WEAPONS.plasma.energyPerShot).toBe(plasmaL1?.energyPerShot)
    expect(WEAPONS.plasma.orb?.aoeRadius).toBe(plasmaL1?.aoeRadius)
    expect(WEAPONS.plasma.orb?.explosionFoci).toBe(plasmaL1?.explosionFoci)
    expect(BALANCE.weapons.levels.plasma).toBe(PLASMA_LEVELS)
  })

  it('does not import balancer (source-text)', () => {
    expect(catalogSource).not.toMatch(/\bfrom ['"].*balancer['"]/)
  })
})
