import { describe, expect, it } from 'vitest'
import { BALANCE } from '../../core/balancer'
import { WEAPONS } from './catalog'
import { LASER_LEVELS } from './weapon-levels'
import catalogSource from './catalog.ts?raw'

describe('WEAPONS catalog', () => {
  it('has laser projectile 30/2/0.12 and plasma orb 14/2.4/0.22/2.2', () => {
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
      speed: 14,
      radius: 0.22,
      lifetime: 2.4,
      aoeRadius: 2.2,
      damageDecayPerUnit: 0.01,
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
  })

  it('does not import balancer (source-text)', () => {
    expect(catalogSource).not.toMatch(/\bfrom ['"].*balancer['"]/)
  })
})
