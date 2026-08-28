import { describe, expect, it, vi } from 'vitest'
import { BALANCE } from '../core/balancer.ts'
import type { InputManager } from './input-manager.ts'
import { CharSheetManager } from './char-sheet-manager.ts'
import { EnergyManager } from './energy-manager.ts'
import { FiringManager } from './firing-manager.ts'
import { ShotManager } from './shot-manager.ts'
import energySource from './energy-manager.ts?raw'

function makeSheet(ene = 100): CharSheetManager {
  const sheet = CharSheetManager.create()
  ;(sheet.summary as { ENE: number }).ENE = ene
  return sheet
}

function mockInput(holdFire = false): InputManager {
  return {
    isDown: (token: string) => holdFire && token === 'A',
    wasPressed: () => false,
    axis: () => 0,
    update: () => {},
  } as unknown as InputManager
}

describe('EnergyManager', () => {
  it('implements EnergyPort with canAfford and spend', () => {
    const energy = new EnergyManager(makeSheet())
    expect(typeof energy.canAfford).toBe('function')
    expect(typeof energy.spend).toBe('function')
  })

  it('starts at ENE_max from Summary', () => {
    const sheet = makeSheet()
    const energy = new EnergyManager(sheet)
    expect(sheet.summary.ENE).toBe(BALANCE.sheet.playerDefaults.ENE_max)
    expect(energy.canAfford(1)).toBe(true)
  })

  it('canAfford returns false when ENE is below cost', () => {
    const energy = new EnergyManager(makeSheet(1))
    expect(energy.canAfford(1)).toBe(true)
    expect(energy.canAfford(1.01)).toBe(false)
  })

  it('spend subtracts ENE and never goes below 0', () => {
    const sheet = makeSheet(1)
    const energy = new EnergyManager(sheet)
    expect(energy.spend(0.25)).toBe(true)
    expect(sheet.summary.ENE).toBe(0.75)
    expect(energy.spend(10)).toBe(false)
    expect(sheet.summary.ENE).toBe(0.75)
  })

  it('updateSim regenerates REG per second clamped to max', () => {
    const sheet = makeSheet(90)
    const energy = new EnergyManager(sheet, { canRegen: () => true })
    energy.updateSim(1)
    expect(sheet.summary.ENE).toBe(98)
    energy.updateSim(1)
    expect(sheet.summary.ENE).toBe(100)
    energy.updateSim(1)
    expect(sheet.summary.ENE).toBe(100)
  })

  it('spend starts recoveringMs delay before regen', () => {
    const delay = BALANCE.energy.recoveringMs
    const sheet = makeSheet(50)
    const energy = new EnergyManager(sheet, { canRegen: () => true })
    energy.spend(10)
    expect(sheet.summary.ENE).toBe(40)
    energy.updateSim((delay - 1) / 1000)
    expect(sheet.summary.ENE).toBe(40)
    energy.updateSim(0.002)
    expect(sheet.summary.ENE).toBeCloseTo(40 + BALANCE.sheet.playerDefaults.REG * 0.001, 5)
  })

  it('updateSim skips regen when canRegen is false', () => {
    const sheet = makeSheet(50)
    const energy = new EnergyManager(sheet, { canRegen: () => false })
    energy.updateSim(1)
    expect(sheet.summary.ENE).toBe(50)
  })

  it('regenBonus adds to REG rate', () => {
    const sheet = makeSheet(50)
    const energy = new EnergyManager(sheet, {
      canRegen: () => true,
      regenBonus: () => 2,
    })
    energy.spend(1)
    energy.updateSim(BALANCE.energy.recoveringMs / 1000 + 1)
    expect(sheet.summary.ENE).toBe(59)
  })

  it('update/spend allocate no objects', () => {
    const energy = new EnergyManager(makeSheet())
    energy.spend(1)
    energy.updateSim(0.016)
    const setSpy = vi.spyOn(globalThis, 'Set')
    energy.spend(1)
    energy.updateSim(0.016)
    expect(setSpy).not.toHaveBeenCalled()
    setSpy.mockRestore()
  })

  it('module does not import three', () => {
    expect(energySource).not.toMatch(/\bfrom ['"]three['"]/)
    expect(energySource).not.toMatch(/\bimport\s+['"]three['"]/)
  })
})

describe('WPN-05 — energy gate on fire', () => {
  it('laser drains; at 0 fire is a no-op', () => {
    const cost = BALANCE.weapons.laser.energyPerShot
    const sheet = makeSheet(cost)
    const energy = new EnergyManager(sheet)
    const shots = new ShotManager()
    const firing = new FiringManager(mockInput(true), energy, sheet, shots)

    firing.updateSim(1 / 60, { x: 0, z: 0 })
    expect(sheet.summary.ENE).toBe(0)
    expect(shots.activeShots.length).toBe(1)

    firing.updateSim(1, { x: 0, z: 0 })
    expect(sheet.summary.ENE).toBe(0)
    expect(shots.activeShots.length).toBe(1)
  })
})

describe('POC2 energizing gate', () => {
  it('blocks regen while ship status is not energizing', () => {
    const sheet = makeSheet(50)
    let holdFire = false
    const input = {
      isDown: (token: string) => holdFire && token === 'A',
      wasPressed: () => false,
      axis: () => 0,
      update: () => {},
    } as unknown as InputManager
    const energy = new EnergyManager(sheet)
    const shots = new ShotManager()
    const firing = new FiringManager(input, energy, sheet, shots)
    energy.bindRegenGate(() => sheet.shipStatus.energizing)

    energy.spend(1)
    energy.updateSim(BALANCE.energy.recoveringMs / 1000 + 0.5)
    expect(sheet.summary.ENE).toBe(53)

    holdFire = true
    firing.updateSim(0, { x: 0, z: 0 })
    sheet.shipStatus.tick(0)
    const afterFire = sheet.summary.ENE
    energy.updateSim(1)
    expect(sheet.summary.ENE).toBe(afterFire)

    holdFire = false
    firing.updateSim(0, { x: 0, z: 0 })
    sheet.shipStatus.tick(BALANCE.player.cooldowns.shootingMs)
    energy.updateSim(1)
    expect(sheet.summary.ENE).toBeGreaterThan(afterFire)
  })
})
