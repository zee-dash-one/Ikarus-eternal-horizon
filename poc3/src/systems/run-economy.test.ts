import { describe, expect, it } from 'vitest'
import { RunContext } from './run-context.ts'
import { RunResultManager } from './run-result-manager.ts'
import { RunPreparationManager } from './run-preparation-manager.ts'
import { DropManager } from './drop-manager.ts'
import { RunInventory } from './run-inventory.ts'
import { BALANCE } from '../core/balancer.ts'
import { RUN_CONTENT_VERSION } from '../core/run-plan.ts'

function result(mode: 'normal' | 'survivor' = 'normal') {
  return new RunResultManager({ runId: 'economy', mode, seed: 'economy-seed', contentVersion: RUN_CONTENT_VERSION, buildVersion: 'test' })
}
async function context(mode: 'normal' | 'survivor' = 'normal') {
  const ctx = await new RunPreparationManager().prepare(result(mode), { world: BALANCE.world, preparation: BALANCE.preparation, parallax: BALANCE.parallax.layers }, new AbortController().signal,
    { createView: () => ({ layerCount: 3, warmup() {}, dispose() {} }), yieldControl: async () => {} })
  for (let i = 0; i < BALANCE.combat.entryTicks; i++) ctx.simulation.step()
  return ctx
}
describe('F01 / run economy', () => {
  it('keeps partially accepted loot on field and caps both inventory and pool', () => {
    const inventory = new RunInventory(), drops = new DropManager(inventory)
    inventory.tryAdd('metalScrap', BALANCE.economy.inventory.metalScrap - 1)
    drops.spawn('metalScrap', 4, 0, 0); drops.updateSim(1 / 60)
    expect(inventory.stock.metalScrap).toBe(BALANCE.economy.inventory.metalScrap)
    expect(drops.entities[0]).toMatchObject({ active: true, amount: 3 })
    for (let i = 0; i < BALANCE.economy.drops.budget + 1; i++) drops.spawn('denseCore', 1, 0, -10)
    expect(drops.entities.filter((d) => d.active)).toHaveLength(BALANCE.economy.drops.budget)
    expect(drops.omitted).toBeGreaterThan(0)
  })
  it('rolls loot deterministically without sharing combat random draws', async () => {
    const a = await context(), b = await context()
    const event = { type: 'drop_requested', source: 'enemy', sourceId: 'boss', rank: 'miniboss', x: 0, z: 0 } as const
    a.drops.onSourceKilled(event); b.drops.onSourceKilled(event)
    expect(a.drops.entities).toEqual(b.drops.entities)
    expect(a.drops.entities.some((d) => d.active && d.material === 'denseCore')).toBe(true)
    a.dispose(); b.dispose()
  })
  it('pays once, allows one paused craft, repairs DRIFTING and releases all run state', async () => {
    const ctx = await context(), energy = ctx.sheet.summary.ENE
    ctx.sheet.applyIntegrityDamage(ctx.sheet.summary.HP)
    expect(ctx.sheet.summary.integrityState).toBe('DRIFTING')
    ctx.inventory.tryAdd('metalScrap', 20)
    expect(ctx.crafting.start('repair', false)).toBe(false)
    expect(ctx.crafting.start('repair', true)).toBe(true)
    expect(ctx.sheet.summary.ENE).toBe(energy - 15)
    expect(ctx.inventory.stock.metalScrap).toBe(12)
    expect(ctx.crafting.start('repair', true)).toBe(false)
    ctx.crafting.updatePaused(3)
    expect(ctx.sheet.summary.HP).toBe(35)
    expect(ctx.sheet.summary.integrityState).not.toBe('DRIFTING')
    ctx.dispose()
    const next = new RunContext(result())
    expect(next.inventory.stock.metalScrap).toBe(0)
    expect(next.equipment).toHaveLength(0)
    expect(next.firing.loadout).toEqual(['laser'])
    next.dispose()
  })
  it('crafts weapons/equipment without resetting damage, energy or shields', async () => {
    const ctx = await context()
    ctx.inventory.tryAdd('metalScrap', 100); ctx.inventory.tryAdd('prismaticCrystal', 20)
    ctx.sheet.applyIntegrityDamage(20)
    const hp = ctx.sheet.summary.HP
    expect(ctx.crafting.start('panels', true)).toBe(true); ctx.crafting.updatePaused(5)
    expect(ctx.sheet.summary.DEF).toBe(BALANCE.sheet.playerDefaults.DEF + 5)
    expect(ctx.sheet.summary.HP).toBe(hp)
    expect(ctx.sheet.summary.ENE).toBe(80)
    expect(ctx.crafting.start('plasma', true)).toBe(true); ctx.crafting.updatePaused(5)
    expect(ctx.firing.loadout).toEqual(['laser', 'plasma'])
    ctx.firing.select('plasma'); expect(ctx.firing.activeWeapon).toBe('plasma')
    ctx.dispose()
  })
  it('Survivor starts clean and blocks secondary, bombs, loot/crafting and equipment', async () => {
    const ctx = await context('survivor')
    ctx.inventory.tryAdd('metalScrap', 200)
    expect(ctx.crafting.start('repair', true)).toBe(false)
    expect(ctx.installEquipment('reactive-panels')).toBe(false)
    expect(ctx.firing.unlock('plasma')).toBe(false)
    ctx.firing.addBombs(5); ctx.firing.upgrade()
    ctx.simulation.step({ moveX: 0, moveZ: 0, held: ['A'], pressed: ['B', 'X'] })
    expect(ctx.firing.activeWeapon).toBe('laser')
    expect(ctx.firing.level).toBe(1)
    expect(ctx.firing.bombCharges).toBe(0)
    expect(ctx.shots.activeShots).toHaveLength(1)
    ctx.dispose()
  })
  it('uses distinct weapon profiles and Summary damage, with one shared energy pool', () => {
    const ctx = new RunContext(result())
    for (const id of ['plasma', 'beam', 'mjolnir']) ctx.firing.unlock(id)
    ctx.input.load({ moveX: 0, moveZ: 0, held: ['A'], pressed: [] })
    ctx.firing.select('plasma'); ctx.firing.updateSim(1 / 60, ctx.player.pose)
    expect(ctx.shots.activeShots[0]).toMatchObject({ weapon: 'plasma', damage: 80, area: 5 })
    ctx.firing.select('beam'); ctx.firing.updateSim(1 / 60, ctx.player.pose)
    expect(ctx.firing.areaAttack).toMatchObject({ active: true, kind: 'beam', damage: 1.5 })
    ctx.firing.select('mjolnir'); ctx.firing.updateSim(1 / 60, ctx.player.pose)
    expect(ctx.firing.areaAttack).toMatchObject({ active: true, kind: 'mjolnir', damage: 55 })
    ctx.dispose()
  })
})
