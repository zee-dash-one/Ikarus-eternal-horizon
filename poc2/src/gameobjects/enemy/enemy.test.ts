import { describe, expect, it } from 'vitest'
import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three'
import { BALANCE } from '../../core/balancer'
import { EnemySquadManager } from '../../systems/enemy-squad-manager'
import type { ShotLike } from '../../systems/shot-manager'
import { Enemy } from './enemy'
import {
  cloneWarriorSheet,
  warriorAgilityLambda,
  warriorEngageRange,
  warriorMaxForce,
  warriorMaxSpeed,
  ROGUE,
  TANK,
  WARRIOR,
} from './warrior'

function makeShotPort(spawns: unknown[]) {
  return {
    acquire(): ShotLike | null {
      const shot: ShotLike = {
        active: false,
        lifetime: 0,
        x: 0,
        z: 0,
        spawnX: 0,
        spawnZ: 0,
        range: 0,
        activate(spawn: unknown) {
          spawns.push(spawn)
          this.active = true
        },
        update() {
          /* stub */
        },
        syncRender() {
          /* stub */
        },
        deactivate() {
          this.active = false
        },
      }
      return shot
    },
    release() {
      /* stub */
    },
  }
}

/** Squad seeded with a live arena so registration can roll patrol targets. */
function makeSquad(): EnemySquadManager {
  const squad = new EnemySquadManager({ capacity: 8, rand: () => 0.5 })
  squad.update(0, 0, 0, -60, 60)
  return squad
}

describe('Warrior sheet', () => {
  it('exposes gate→player targets, agility, intelligence and fixed weapon', () => {
    expect(WARRIOR.id).toBe('warrior')
    expect(WARRIOR.targets).toEqual(['enemyGate', 'player'])
    expect(WARRIOR.agility).toBeGreaterThan(0)
    expect(WARRIOR.intelligence).toBeGreaterThan(0)
    expect(WARRIOR.weapon.rate).toBeGreaterThan(0)
    expect(WARRIOR.weapon.damage).toBeGreaterThan(0)
    expect(BALANCE.enemy.warrior).toEqual(WARRIOR)
  })

  it('maps agility to a damp lambda curve', () => {
    expect(warriorAgilityLambda(0)).toBeCloseTo(1.2, 5)
    expect(warriorAgilityLambda(100)).toBeCloseTo(6.2, 5)
    expect(warriorAgilityLambda(55)).toBeGreaterThan(warriorAgilityLambda(0))
  })

  it('derives maxSpeed as agility / 10 and maxForce as agility / 5', () => {
    expect(warriorMaxSpeed(55)).toBeCloseTo(5.5, 5)
    expect(warriorMaxSpeed(0)).toBe(0)
    expect(warriorMaxForce(55)).toBeCloseTo(11, 5)
    expect(WARRIOR.maxSpeed).toBeCloseTo(warriorMaxSpeed(WARRIOR.agility), 5)
    expect(cloneWarriorSheet({ ...WARRIOR, agility: 80, maxSpeed: 1 }).maxSpeed).toBe(8)
    expect(cloneWarriorSheet({ ...WARRIOR, agility: 80, maxForce: 1 }).maxForce).toBe(16)
  })

  it('maps intelligence to engage range fraction', () => {
    expect(warriorEngageRange(0, 28)).toBeCloseTo(28 * 0.35, 5)
    expect(warriorEngageRange(100, 28)).toBeCloseTo(28, 5)
  })

  it('carries squad knobs: formation, morale and affinity', () => {
    expect(WARRIOR.formation.imperfectionRadius).toBeGreaterThan(0)
    expect(WARRIOR.morale.furyProximitySec).toBe(2)
    expect(WARRIOR.affinity.radius).toBeGreaterThan(0)
    expect(WARRIOR.shieldMax).toBeGreaterThan(0)
  })

  it('starts Warrior 80/40, Rogue 60/30, Tank 140/70', () => {
    expect(WARRIOR.hp).toBe(80)
    expect(WARRIOR.shieldMax).toBe(40)
    expect(ROGUE.hp).toBe(60)
    expect(ROGUE.shieldMax).toBe(30)
    expect(TANK.hp).toBe(140)
    expect(TANK.shieldMax).toBe(70)
  })
})

describe('Enemy Warrior — birth', () => {
  it('activate loads the Warrior sheet and starts the birth animation', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 1, y: 50, z: -10 })
    expect(enemy.archetype()).toBe('warrior')
    expect(enemy.sheet().weapon.damage).toBe(WARRIOR.weapon.damage)
    expect(enemy.hp).toBe(WARRIOR.hp)
    expect(enemy.contactDamage).toBeCloseTo(
      WARRIOR.hp * BALANCE.collision.contactIntegrityFrac,
      5,
    )
    expect(enemy.shield).toBe(WARRIOR.shieldMax)
    expect(enemy.aiState()).toBe('birth')
    enemy.dispose()
    geo.dispose()
  })

  it('contactDamage is 20% of current hull hp', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    const frac = BALANCE.collision.contactIntegrityFrac
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.hp = 10
    sheet.shieldMax = 0
    enemy.activate({ x: 0, y: 0, z: 0, sheet })
    expect(enemy.contactDamage).toBeCloseTo(10 * frac, 5)
    enemy.applyDamage(4, 0)
    expect(enemy.hp).toBe(6)
    expect(enemy.contactDamage).toBeCloseTo(6 * frac, 5)
    enemy.dispose()
    geo.dispose()
  })

  it('birth aims at gate centre + personal entry offset X', () => {
    const seek = { x: 100, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 50, z: -140, gateEntryOffsetX: 18 })
    expect(enemy.gateEntryOffsetX()).toBe(18)
    enemy.update(0.5)
    expect(enemy.x).toBeGreaterThan(0)
    expect(enemy.aiState()).toBe('birth')
    enemy.dispose()
    geo.dispose()
  })

  it('birth descends in Y toward the gate, not sideways to the ship', () => {
    const seek = { x: 100, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 50, z: -140 })
    enemy.update(0.5)
    expect(enemy.y).toBeLessThan(50)
    expect(enemy.z).toBeGreaterThan(-140)
    expect(Math.abs(enemy.x)).toBeLessThan(5)
    expect(enemy.aiState()).toBe('birth')
    enemy.dispose()
    geo.dispose()
  })

  it('handoff preserves personal gate entry X (no snap to gate centre)', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    const entryX = -18
    enemy.activate({ x: -160, y: 50, z: -140, gateEntryOffsetX: entryX, pathSide: 'left' })
    for (let i = 0; i < 300; i++) {
      enemy.update(0.05)
      if (enemy.aiState() !== 'birth') {
        break
      }
    }
    expect(enemy.aiState()).not.toBe('birth')
    const atGateX = enemy.x
    expect(Math.abs(atGateX - (gate.x + entryX))).toBeLessThan(1.5)
    for (let i = 0; i < 4; i++) {
      enemy.update(0.05)
    }
    expect(Math.abs(enemy.x - atGateX)).toBeLessThan(3)
    enemy.dispose()
    geo.dispose()
  })

  it('handoff keeps the gate-plane Y without a snap teleport', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 2, z: -8 })
    const yBefore = enemy.y
    for (let i = 0; i < 80; i++) {
      enemy.update(0.1)
      if (enemy.aiState() !== 'birth') {
        break
      }
    }
    expect(enemy.aiState()).not.toBe('birth')
    expect(Math.abs(enemy.y - gate.y)).toBeLessThan(0.25)
    expect(Math.abs(enemy.y - yBefore)).toBeLessThan(3)
    enemy.dispose()
    geo.dispose()
  })

  it('speed eases from rush down to cruise along the birth path', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 50, z: -140 })
    const rush = WARRIOR.maxSpeed * WARRIOR.reachSpeedMul
    expect(enemy.currentSpeed()).toBe(rush)
    enemy.update(0.05)
    const mid = enemy.currentSpeed()
    expect(mid).toBeLessThan(rush)
    expect(mid).toBeGreaterThan(WARRIOR.maxSpeed)
    enemy.dispose()
    geo.dispose()
  })

  it('clears the gate at cruise speed and joins formation without stopping', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 50, z: -140 })
    for (let i = 0; i < 400; i++) {
      enemy.update(0.05)
      if (enemy.aiState() !== 'birth') {
        break
      }
    }
    expect(enemy.aiState()).toBe('formation')
    expect(enemy.currentSpeed()).toBeCloseTo(WARRIOR.maxSpeed, 5)
    expect(Math.hypot(enemy.vx, enemy.vz)).toBeCloseTo(WARRIOR.maxSpeed, 5)
    enemy.dispose()
    geo.dispose()
  })
})

describe('Enemy Warrior — squad life', () => {
  it('registers with a group once the gate is cleared', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -40 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 0, y: 20, z: -120 })
    for (let i = 0; i < 400; i++) {
      enemy.update(0.05)
      if (enemy.aiState() !== 'birth') {
        break
      }
    }
    const snap = enemy.statusSnapshot()
    expect(enemy.aiState()).not.toBe('birth')
    expect(snap.groupId).toBe(0)
    expect(snap.slotIndex).toBe(0)
    expect(squad.activeGroupCount()).toBe(1)
    enemy.syncRender()
    const label = enemy.getObjectByName('enemy.groupLabel')
    expect(label).not.toBeNull()
    expect(label?.visible).toBe(true)
    enemy.dispose()
    geo.dispose()
  })

  it('flies toward its reserved slot and settles into formation', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -40 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 0, y: 0, z: -30, sheet })
    const group = enemy.currentGroup()
    expect(group).not.toBeNull()

    let closest = Number.POSITIVE_INFINITY
    for (let i = 0; i < 200; i++) {
      squad.update(0.05, seek.x, seek.z, -60, 60)
      enemy.update(0.05)
      const slot = { x: 0, z: 0 }
      group?.localToWorld(group.slotOffsetX(0), group.slotOffsetZ(0), slot)
      closest = Math.min(closest, Math.hypot(enemy.x - slot.x, enemy.z - slot.z))
    }
    expect(closest).toBeLessThan(sheet.formation.boostDistance)
    enemy.dispose()
    geo.dispose()
  })

  it('BOOSTs after being knocked far away from its slot', () => {
    const seek = { x: 0, y: 0, z: -200 }
    const gate = { x: 0, y: 0, z: -40 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 0, y: 0, z: -30, sheet })
    enemy.update(0.05)
    expect(enemy.aiState()).toBe('formation')

    enemy.x += sheet.formation.boostDistance * 4
    enemy.update(0.05)
    expect(enemy.aiState()).toBe('boost')
    enemy.dispose()
    geo.dispose()
  })

  it('goes FURY after sustained player proximity and leaves the formation', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 0, y: 0, z: -4, sheet })
    expect(enemy.currentGroup()).not.toBeNull()

    for (let i = 0; i < Math.ceil(sheet.morale.furyProximitySec / 0.05) + 2; i++) {
      enemy.update(0.05)
    }
    expect(enemy.aiState()).toBe('fury')
    expect(enemy.isRogue()).toBe(true)
    expect(enemy.currentGroup()).toBeNull()
    expect(squad.rogueCount()).toBe(0)
    squad.update(0.016, seek.x, seek.z, -60, 60)
    expect(squad.rogueCount()).toBe(1)
    expect(squad.furyCount()).toBe(1)
    enemy.dispose()
    geo.dispose()
  })

  it('refuses a fifth FURY while four are already raging', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    squad.liveConfig().maxFury = 4
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    sheet.morale.furyProximitySec = 0.05
    const enemies: Enemy[] = []
    for (let i = 0; i < 5; i += 1) {
      const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
      enemy.activate({ x: i * 0.5, y: 0, z: -3, sheet })
      enemies.push(enemy)
    }
    for (let frame = 0; frame < 8; frame += 1) {
      squad.update(0.05, seek.x, seek.z, -60, 60)
      for (const enemy of enemies) {
        enemy.update(0.05)
      }
    }
    const fury = enemies.filter((enemy) => enemy.aiState() === 'fury').length
    expect(fury).toBe(4)
    expect(squad.furyCount()).toBe(4)
    expect(squad.canEnterFury()).toBe(false)
    for (const enemy of enemies) {
      enemy.dispose()
    }
    geo.dispose()
  })

  it('FURY drives a kamikaze intercept toward the player', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    sheet.morale.furyProximitySec = 0.05
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 8, y: 0, z: -6, sheet })
    for (let i = 0; i < 8; i++) {
      enemy.update(0.05)
    }
    expect(enemy.aiState()).toBe('fury')
    const beforeX = Math.abs(enemy.x - seek.x)
    const beforeZ = enemy.z
    for (let i = 0; i < 40; i++) {
      enemy.update(0.05)
    }
    expect(Math.abs(enemy.x - seek.x)).toBeLessThan(beforeX)
    expect(enemy.z).toBeGreaterThan(beforeZ)
    enemy.dispose()
    geo.dispose()
  })

  it('FURY keeps advancing past the player instead of parking on their Z line', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    sheet.morale.furyProximitySec = 0.05
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 0, y: 0, z: -3, sheet })
    for (let i = 0; i < 4; i++) {
      enemy.update(0.05)
    }
    expect(enemy.aiState()).toBe('fury')
    // Sit on the old parking line — FURY must still push through.
    enemy.z = seek.z
    enemy.vz = 0
    for (let i = 0; i < 40; i++) {
      enemy.update(0.05)
    }
    expect(enemy.z).toBeGreaterThan(seek.z + 5)
    expect(enemy.vz).toBeGreaterThan(0)
    enemy.dispose()
    geo.dispose()
  })

  it('FLEEs the moment its shield breaks', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 6, y: 0, z: -40, sheet })

    const out = enemy.applyDamage(sheet.shieldMax, 0)
    expect(out.absorbedByShield).toBe(sheet.shieldMax)
    expect(out.dealtToHull).toBe(0)
    expect(out.shieldBroke).toBe(true)
    expect(enemy.aiState()).toBe('flee')
    expect(enemy.currentGroup()).toBeNull()

    const startX = enemy.x
    const startZ = enemy.z
    enemy.vz = 6
    for (let i = 0; i < 40; i++) {
      enemy.update(0.05)
    }
    expect(enemy.x).toBeGreaterThan(startX)
    expect(enemy.z).toBeLessThan(startZ)
    expect(enemy.vz).toBeLessThan(0)
    enemy.dispose()
    geo.dispose()
  })

  it('retaliates with FURY after rapid hits that never break the shield', () => {
    const seek = { x: 0, y: 0, z: -200 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const squad = makeSquad()
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate, squad })
    enemy.activate({ x: 0, y: 0, z: -40, sheet })

    for (let i = 0; i < sheet.morale.retaliationHits - 1; i++) {
      enemy.applyDamage(0.2, 0)
    }
    expect(enemy.aiState()).toBe('formation')
    enemy.applyDamage(0.2, 0)
    expect(enemy.aiState()).toBe('fury')
    expect(enemy.shield).toBeGreaterThan(0)
    enemy.dispose()
    geo.dispose()
  })
})

describe('Enemy Warrior — combat', () => {
  it('fires weapon bolts along the nose (+Z when facing forward)', () => {
    const seek = { x: 0, y: 0, z: 10 }
    const gate = { x: 0, y: 0, z: -8 }
    const spawns: unknown[] = []
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({
      geometry: geo,
      seekTarget: seek,
      gateTarget: gate,
      shots: makeShotPort(spawns),
    })
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    sheet.weapon.rate = 10
    sheet.weapon.fireConeDeg = 40
    enemy.activate({ x: 0, y: 0, z: 0, sheet })
    for (let i = 0; i < 30; i++) {
      enemy.update(0.05)
    }
    expect(enemy.aiState()).not.toBe('birth')
    expect(spawns.length).toBeGreaterThan(0)
    const bolt = spawns[0] as { vx: number; vz: number; damage: number }
    expect(bolt.vx).toBeCloseTo(0, 5)
    expect(bolt.vz).toBeGreaterThan(0)
    expect(bolt.damage).toBe(WARRIOR.weapon.damage)
    enemy.dispose()
    geo.dispose()
  })

  it('holds fire while the player sits outside the nose cone', () => {
    const seek = { x: 0, y: 0, z: -20 }
    const gate = { x: 0, y: 0, z: -8 }
    const spawns: unknown[] = []
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({
      geometry: geo,
      seekTarget: seek,
      gateTarget: gate,
      shots: makeShotPort(spawns),
    })
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    sheet.weapon.rate = 10
    sheet.weapon.fireConeDeg = 20
    enemy.activate({ x: 0, y: 0, z: 0, sheet })
    enemy.update(0.05)
    expect(spawns.length).toBe(0)
    enemy.dispose()
    geo.dispose()
  })

  it('marks in_range and passed_opponent from player proximity / Z', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 0, z: -5, sheet })
    enemy.update(0.05)
    expect(enemy.statusSnapshot().in_range).toBe(true)
    expect(enemy.statusSnapshot().passed_opponent).toBe(false)
    enemy.z = 5
    enemy.update(0.05)
    expect(enemy.statusSnapshot().passed_opponent).toBe(true)
    enemy.dispose()
    geo.dispose()
  })

  it('shield soaks damage first and regenerates once the hit window closes', () => {
    const seek = { x: 0, y: 0, z: -200 }
    const gate = { x: 0, y: 0, z: -8 }
    const geo = new BoxGeometry(1, 1, 1)
    const sheet = cloneWarriorSheet(WARRIOR)
    sheet.targets = ['player']
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 0, z: -40, sheet })

    const out = enemy.applyDamage(1, 0)
    expect(out.absorbedByShield).toBe(1)
    expect(out.dealtToHull).toBe(0)
    expect(enemy.hp).toBe(WARRIOR.hp)
    const drained = enemy.shield

    for (let i = 0; i < 40; i++) {
      enemy.update(0.05)
    }
    expect(enemy.shield).toBeGreaterThan(drained)
    enemy.dispose()
    geo.dispose()
  })

  it('takeDamage through shield and hull deactivates once', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 0, z: -5 })
    expect(enemy.applyDamage(WARRIOR.hp + WARRIOR.shieldMax, 0).killed).toBe(true)
    expect(enemy.active).toBe(false)
    expect(enemy.dying).toBe(true)
    expect(enemy.visible).toBe(true)
    expect(enemy.applyDamage(2, 0).killed).toBe(false)
    enemy.dispose()
    geo.dispose()
  })

  it('draws a solid gunship body and a blue wireframe cube as the hitbox', () => {
    const seek = { x: 0, y: 0, z: 0 }
    const gate = { x: 0, y: 0, z: -90 }
    const geo = new BoxGeometry(1, 1, 1)
    const enemy = new Enemy({ geometry: geo, seekTarget: seek, gateTarget: gate })
    enemy.activate({ x: 0, y: 0, z: 0 })
    const hitboxMat = enemy.material
    if (!(hitboxMat instanceof MeshBasicMaterial)) {
      throw new Error('expected a MeshBasicMaterial hitbox')
    }
    expect(hitboxMat.wireframe).toBe(true)
    expect(hitboxMat.color.getHex()).toBe(BALANCE.debug.hitbox.color)
    expect(enemy.scale.x).toBeCloseTo(WARRIOR.radius * 2, 5)
    const fuselage = enemy.getObjectByName('enemy.fuselage')
    if (!(fuselage instanceof Mesh)) {
      throw new Error('expected a solid fuselage mesh')
    }
    const bodyMat = fuselage.material
    if (!(bodyMat instanceof MeshBasicMaterial)) {
      throw new Error('expected a MeshBasicMaterial body')
    }
    expect(bodyMat.wireframe).toBe(false)
    expect(bodyMat.color.getHex()).toBe(WARRIOR.color)
    expect(enemy.getObjectByName('enemy.wings')).toBeTruthy()
    expect(enemy.getObjectByName('enemy.nose')).toBeTruthy()
    expect(enemy.getObjectByName('enemy.tail')).toBeTruthy()
    enemy.dispose()
    geo.dispose()
  })
})
