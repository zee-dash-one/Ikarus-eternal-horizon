import { describe, expect, it } from 'vitest'
import { copyWeaponConfig, WEAPONS } from './catalog'
import { applyPlasmaLevel, PLASMA_LEVELS } from './plasma-levels'

const DAMAGE = [80, 80, 80, 80, 100, 100, 100, 100, 120, 120, 120, 120] as const
const ENERGY = [4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6] as const
const AOE = [2.4, 2.4, 2.4, 2.4, 2.8, 2.8, 2.8, 2.8, 3.2, 3.2, 3.2, 3.2] as const
const DURATION = [0.4, 0.4, 0.4, 0.4, 0.45, 0.45, 0.45, 0.45, 0.5, 0.5, 0.5, 0.5] as const
const FOCI = [1, 1, 1, 1, 3, 3, 3, 3, 5, 5, 5, 5] as const

describe('PLASMA_LEVELS', () => {
  it('has 12 rows, levels 1..12', () => {
    expect(PLASMA_LEVELS).toHaveLength(12)
    expect(PLASMA_LEVELS.map((row) => row.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('every row has speed 12, radius 0.28, lifetime 3, and no distance decay', () => {
    for (const row of PLASMA_LEVELS) {
      expect(row.speed).toBe(12)
      expect(row.radius).toBe(0.28)
      expect(row.lifetime).toBe(3)
      expect(row.damageDecayPerUnit).toBe(0)
      expect(row.rate).toBe(2)
    }
  })

  it('damage / energy / aoe / duration / foci step every four levels', () => {
    expect(PLASMA_LEVELS.map((row) => row.damage)).toEqual([...DAMAGE])
    expect(PLASMA_LEVELS.map((row) => row.energyPerShot)).toEqual([...ENERGY])
    expect(PLASMA_LEVELS.map((row) => row.aoeRadius)).toEqual([...AOE])
    expect(PLASMA_LEVELS.map((row) => row.aoeDuration)).toEqual([...DURATION])
    expect(PLASMA_LEVELS.map((row) => row.explosionFoci)).toEqual([...FOCI])
  })

  it('applyPlasmaLevel(cfg, 5) writes 3 foci, damage 100, aoe 2.8', () => {
    const cfg = copyWeaponConfig(WEAPONS.plasma)
    applyPlasmaLevel(cfg, 5)
    expect(cfg.damage).toBe(100)
    expect(cfg.rate).toBe(2)
    expect(cfg.energyPerShot).toBe(5)
    expect(cfg.orb?.aoeRadius).toBe(2.8)
    expect(cfg.orb?.aoeDuration).toBe(0.45)
    expect(cfg.orb?.explosionFoci).toBe(3)
  })

  it('applyPlasmaLevel(cfg, 12) writes 5 foci, damage 120, aoe 3.2', () => {
    const cfg = copyWeaponConfig(WEAPONS.plasma)
    applyPlasmaLevel(cfg, 12)
    expect(cfg.energyPerShot).toBe(6)
    expect(cfg.damage).toBe(120)
    expect(cfg.orb?.explosionFoci).toBe(5)
    expect(cfg.orb?.aoeRadius).toBe(3.2)
    expect(cfg.orb?.aoeDuration).toBe(0.5)
  })

  it('applyPlasmaLevel(cfg, 99) is a no-op', () => {
    const cfg = copyWeaponConfig(WEAPONS.plasma)
    applyPlasmaLevel(cfg, 99)
    expect(cfg.damage).toBe(80)
    expect(cfg.orb?.explosionFoci).toBe(1)
  })
})
