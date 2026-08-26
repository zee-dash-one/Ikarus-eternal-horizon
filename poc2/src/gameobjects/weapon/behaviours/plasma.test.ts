import { describe, expect, it, vi } from 'vitest'
import type { ShotSpawn } from '../../shot/weapon-shot'
import { copyWeaponConfig, WEAPONS } from '../catalog'
import { defaultModifiers, WEAPON_REGISTRY } from '../registry'
import type { BehaviourCtx, EnergyPort } from '../registry'
import { Weapon } from '../weapon'
import { applyWeaponLevel } from '../weapon-levels'
import './plasma'
import { PlasmaBehaviour } from './plasma'

interface RecordedShot {
  activate(spawn: ShotSpawn): void
}

function recordingPort(nullAcquire = false, limit = Infinity) {
  const spawns: ShotSpawn[] = []
  let remaining = limit
  let released = 0
  const port = {
    acquire(): RecordedShot | null {
      if (nullAcquire || remaining <= 0) {
        return null
      }
      remaining -= 1
      return {
        activate(spawn: ShotSpawn) {
          spawns.push(spawn)
        },
      }
    },
    release() {
      released += 1
    },
  }
  return { port, spawns, released: () => released }
}

function energyStub(afford = true): EnergyPort & { spent: number[] } {
  const spent: number[] = []
  return {
    spent,
    canAfford() {
      return afford
    },
    spend(cost: number) {
      spent.push(cost)
    },
  }
}

function ctx(overrides: Partial<BehaviourCtx> = {}, energy?: EnergyPort): BehaviourCtx {
  return {
    dt: 0,
    holding: true,
    muzzle: { x: 1, y: 0, z: -2 },
    services: { energy: energy ?? energyStub() },
    mods: defaultModifiers(),
    ...overrides,
  }
}

describe('PlasmaBehaviour', () => {
  it('implements WeaponBehaviour', () => {
    const { port } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    expect(typeof plasma.update).toBe('function')
    expect(typeof plasma.dispose).toBe('function')
    plasma.dispose()
  })

  it('activates a WeaponShot from the acquire port (no other entity type)', () => {
    const { port, spawns } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx())
    expect(spawns).toHaveLength(1)
    plasma.dispose()
  })

  it('writes aoeRadius 2.4 * aoeMul onto the spawn', () => {
    const { port, spawns } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    const mods = defaultModifiers()
    mods.aoeMul = 2
    plasma.update(ctx({ mods }))
    expect(spawns[0]?.aoeRadius).toBe(4.8)
    plasma.dispose()
  })

  it('writes vz=-12, radius 0.28, lifetime 3, damage 80, color 0xfb923c', () => {
    const { port, spawns } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx())
    expect(spawns[0]).toMatchObject({
      vx: 0,
      vz: -12,
      radius: 0.28,
      lifetime: 3,
      damage: 80,
      aoeDuration: 0.4,
      decayPerUnit: 0,
      color: 0xfb923c,
    })
    plasma.dispose()
  })

  it('does not write a y field on ShotSpawn', () => {
    const { port, spawns } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx())
    expect(spawns[0]).not.toHaveProperty('y')
    plasma.dispose()
  })

  it('spends 4 energy and skips the shot when canAfford is false', () => {
    const { port, spawns } = recordingPort()
    const energy = energyStub(false)
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx({}, energy))
    expect(spawns).toHaveLength(0)
    expect(energy.spent).toHaveLength(0)
    plasma.dispose()
  })

  it('sets cooldown to 1/2 after a successful spawn', () => {
    const { port, spawns } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx({ dt: 0 }))
    expect(spawns).toHaveLength(1)
    plasma.update(ctx({ dt: 0.49 }))
    expect(spawns).toHaveLength(1)
    plasma.update(ctx({ dt: 0.02 }))
    expect(spawns).toHaveLength(2)
    plasma.dispose()
  })

  it('does not call takeDamage', () => {
    const { port } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    const source = plasma.update.toString()
    expect(source).not.toMatch(/takeDamage/)
    plasma.dispose()
  })

  it('does not apply AoE while the orb is in flight', () => {
    const { port, spawns } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx())
    expect(spawns[0]?.aoeRadius).toBe(2.4)
    plasma.dispose()
  })

  it('L5 volley activates 3 orbs and spends energy once', () => {
    const { port, spawns } = recordingPort()
    const energy = energyStub()
    const cfg = copyWeaponConfig(WEAPONS.plasma)
    applyWeaponLevel(cfg, 5)
    const plasma = new PlasmaBehaviour(cfg, port)
    plasma.update(ctx({}, energy))
    expect(spawns).toHaveLength(3)
    expect(energy.spent).toEqual([5])
    expect(new Set(spawns.map((s) => s.x)).size).toBe(3)
    plasma.dispose()
  })

  it('skips the volley and does not spend when the pool cannot cover every focus', () => {
    const { port, spawns, released } = recordingPort(false, 2)
    const energy = energyStub()
    const cfg = copyWeaponConfig(WEAPONS.plasma)
    applyWeaponLevel(cfg, 5)
    const plasma = new PlasmaBehaviour(cfg, port)
    plasma.update(ctx({}, energy))
    expect(spawns).toHaveLength(0)
    expect(energy.spent).toHaveLength(0)
    expect(released()).toBe(2)
    plasma.dispose()
  })

  it('skips spawn and does not burn cooldown when acquire() is null', () => {
    const { port } = recordingPort(true)
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx({ dt: 0 }))
    plasma.update(ctx({ dt: 0 }))
    plasma.dispose()
  })

  it('update allocates no objects', () => {
    const { port } = recordingPort()
    const plasma = new PlasmaBehaviour(copyWeaponConfig(WEAPONS.plasma), port)
    plasma.update(ctx())
    const setSpy = vi.spyOn(globalThis, 'Set')
    plasma.update(ctx({ dt: 1 }))
    expect(setSpy).not.toHaveBeenCalled()
    setSpy.mockRestore()
    plasma.dispose()
  })
  it('applyLevel 12 writes 5 foci and higher damage/aoe vs L1', () => {
    const { port } = recordingPort()
    const weapon = new Weapon({ id: 'plasma', shots: port })
    weapon.applyLevel(1)
    const l1Damage = weapon.config.damage
    const l1Aoe = weapon.config.orb?.aoeRadius
    expect(weapon.config.orb?.explosionFoci).toBe(1)
    weapon.applyLevel(12)
    expect(weapon.config.damage).toBeGreaterThan(l1Damage)
    expect(weapon.config.orb?.aoeRadius).toBeGreaterThan(l1Aoe ?? 0)
    expect(weapon.config.orb?.explosionFoci).toBe(5)
    weapon.dispose()
  })
})

describe('registerPlasma', () => {
  it('registerWeapon("plasma", factory) lets Weapon construct without a switch', () => {
    expect(WEAPON_REGISTRY.plasma).toBeTypeOf('function')
    const { port } = recordingPort()
    const weapon = new Weapon({ id: 'plasma', shots: port })
    expect(weapon.id).toBe('plasma')
    weapon.dispose()
  })
})
