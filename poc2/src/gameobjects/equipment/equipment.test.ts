import { describe, expect, it } from 'vitest'
import { DASH_LEVELS } from '../controller/dash-levels'
import { copyWeaponConfig, WEAPONS } from '../weapon/catalog'
import { LASER_LEVELS } from '../weapon/weapon-levels'
import {
  addWeaponMods,
  cloneEquips,
  defaultEnemyEquips,
  defaultPlayerEquips,
  EQUIP_CATALOG,
  EQUIP_MODS,
  isLegalForSlot,
  overlayResolvedWeapon,
  parseDashStamp,
  parseWeaponStamp,
  resolveEquips,
  weaponStampId,
} from './equipment'

describe('weapon stamps', () => {
  it('parses laser_lvl_1 as weapon laser level 1', () => {
    expect(parseWeaponStamp('laser_lvl_1')).toEqual({
      kind: 'weapon',
      id: 'laser_lvl_1',
      weaponId: 'laser',
      level: 1,
    })
    expect(parseWeaponStamp('laser_lvl_13')).toBeNull()
    expect(parseWeaponStamp('dash_lvl_1')).toBeNull()
  })

  it('copies LASER_LEVELS[0] damage/rate/speed/radius onto the snapshot', () => {
    const resolved = resolveEquips(defaultPlayerEquips()).weapon
    const row = LASER_LEVELS[0]
    expect(resolved?.weaponId).toBe('laser')
    expect(resolved?.level).toBe(1)
    expect(resolved?.damage).toBe(row?.damage)
    expect(resolved?.rate).toBe(row?.rate)
    expect(resolved?.speed).toBe(row?.speed)
    expect(resolved?.radius).toBe(row?.radius)
    expect(resolved?.forwardShots).toBe(row?.forwardShots)
  })

  it('fills the exclusive weapon slot from the stamp id', () => {
    const equips = defaultEnemyEquips()
    equips.slots.weapon = weaponStampId('plasma', 5)
    const resolved = resolveEquips(equips).weapon
    expect(resolved?.weaponId).toBe('plasma')
    expect(resolved?.level).toBe(5)
  })
})

describe('weapon mods', () => {
  it('adds enemy_lvl_1_equip deltas onto damage/rate/speed/radius', () => {
    const base = defaultEnemyEquips()
    base.general.push('enemy_lvl_1_equip')
    const withMod = resolveEquips(base).weapon
    const without = resolveEquips(defaultEnemyEquips()).weapon
    expect(EQUIP_MODS.enemy_lvl_1_equip.damage).toBe(0)
    expect(EQUIP_MODS.enemy_lvl_1_equip.rate).toBe(0)
    expect(EQUIP_MODS.enemy_lvl_1_equip.speed).toBe(0)
    expect(EQUIP_MODS.enemy_lvl_1_equip.radius).toBe(0)
    expect(withMod?.damage).toBe(without?.damage)
    expect(withMod?.rate).toBe(without?.rate)
    expect(withMod?.speed).toBe(without?.speed)
    expect(withMod?.radius).toBe(without?.radius)
    const summed = addWeaponMods(
      { damage: 10, rate: 2, speed: 5, radius: 0.1 },
      [{ damage: 3, rate: 1, speed: 4, radius: 0.05 }],
    )
    expect(summed.damage).toBe(13)
    expect(summed.rate).toBe(3)
    expect(summed.speed).toBe(9)
    expect(summed.radius).toBeCloseTo(0.15, 10)
  })

  it('does not change volley or aoe from the stamp', () => {
    const equips = defaultPlayerEquips()
    equips.general.push('enemy_lvl_1_equip')
    const resolved = resolveEquips(equips).weapon
    const row = LASER_LEVELS[0]
    expect(resolved?.forwardShots).toBe(row?.forwardShots)
    expect(resolved?.diagonalShotsPerSide).toBe(row?.diagonalShotsPerSide)
    expect(resolved?.aoeRadius).toBe(row?.aoeRadius)
    expect(resolved?.energyPerShot).toBe(row?.energyPerShot)
  })
})

describe('ficha kit', () => {
  it('keeps equippedWeapon derived from equips', () => {
    const equips = defaultPlayerEquips()
    expect(resolveEquips(equips).weapon?.weaponId).toBe('laser')
    equips.slots.weapon = 'plasma_lvl_2'
    expect(resolveEquips(equips).weapon?.weaponId).toBe('plasma')
    expect(resolveEquips(equips).weapon?.level).toBe(2)
  })

  it('does not treat inventory equipment[] as the kit list', () => {
    expect(EQUIP_CATALOG.defaults.player.slots.weapon).toBe('laser_lvl_1')
    expect(EQUIP_CATALOG.defaults.enemy.slots.weapon).toBe('laser_lvl_1')
    expect(EQUIP_CATALOG.defaults.player.general).toEqual([])
  })

  it('defaults a common ficha to laser_lvl_1', () => {
    expect(defaultEnemyEquips().slots.weapon).toBe('laser_lvl_1')
    expect(defaultPlayerEquips().slots.dash).toBe('dash_lvl_1')
    expect(isLegalForSlot('rockets', 'laser_lvl_1')).toBe(false)
    expect(isLegalForSlot('weapon', 'laser_lvl_1')).toBe(true)
  })

  it('cloneEquips copies slots and general without aliasing', () => {
    const src = defaultPlayerEquips()
    const copy = cloneEquips(src)
    copy.slots.weapon = 'plasma_lvl_1'
    copy.general.push('enemy_lvl_1_equip')
    expect(src.slots.weapon).toBe('laser_lvl_1')
    expect(src.general).toEqual([])
  })

  it('resolves dash_lvl_n from DASH_LEVELS', () => {
    const equips = defaultPlayerEquips()
    equips.slots.dash = 'dash_lvl_12'
    expect(parseDashStamp('dash_lvl_12')?.level).toBe(12)
    expect(resolveEquips(equips).dash).toEqual(DASH_LEVELS[11])
  })

  it('overlays resolved four-pack onto a live weapon config', () => {
    const cfg = copyWeaponConfig(WEAPONS.laser)
    overlayResolvedWeapon(cfg, {
      weaponId: 'laser',
      level: 1,
      damage: 99,
      rate: 7,
      speed: 11,
      radius: 0.4,
      energyPerShot: 0,
      lifetime: 0,
      damageDecayPerUnit: 0,
      aoeRadius: 0,
      aoeDuration: 0,
      explosionFoci: 0,
      forwardShots: 1,
      diagonalShotsPerSide: 0,
      diagonalAngleDeg: 0,
      forwardSpread: 0,
      width: 0,
      length: 0,
      angleDeg: 0,
      ticksPerSec: 0,
      dps: 0,
      energyPerSec: 0,
    })
    expect(cfg.damage).toBe(99)
    expect(cfg.rate).toBe(7)
    expect(cfg.projectile?.speed).toBe(11)
    expect(cfg.projectile?.radius).toBe(0.4)
  })
})
