import { expect, it } from 'vitest'
import { SquadManager } from './squad-manager.ts'
import { EnemyEntity } from './enemy-manager.ts'
import { BALANCE } from '../core/balancer.ts'
import type { EnemySpawn, WavePlan } from '../core/run-plan.ts'

function spawn(slot: number): EnemySpawn {
  return { id: `member-${slot}`, class: 'Warrior', archetypeId: 'fighter', factionId: 'patrol', squadId: 'squad', formation: 'V', slot,
    spawnPointId: 'front', position: { x: 0, z: -180 }, direction: { x: 0, z: 1 }, offsetTicks: slot * 12 }
}
function wave(): WavePlan {
  return { waveIndex: 0, kind: 'regular', completion: 'all-emitted-and-cleared', cooldownTicks: 60, enemies: Array.from({ length: 4 }, (_, i) => spawn(i)) }
}
it('keeps individual strategy independent, elects a leader by level/id and breaks after losses', () => {
  const manager = new SquadManager(), plan = wave()
  const members = plan.enemies.map((descriptor) => { const e = new EnemyEntity(); e.spawn = descriptor; e.active = true; e.base.strategy = 'FindGroup'; return e })
  manager.start(plan); manager.update(members)
  expect(manager.leaderId).toBe('member-0')
  if (members[2]) Reflect.set(members[2].sheet.summary, 'LVL', 2)
  manager.update(members)
  expect(manager.leaderId).toBe('member-2')
  for (let i = 0; i < BALANCE.combat.squad.groupingTicks; i++) manager.update(members)
  expect(manager.strategy).toBe('PatrolAround')
  expect(members.every((e) => e.base.strategy === 'FindGroup')).toBe(true)
  for (const e of members.slice(1)) e.active = false
  manager.update(members)
  expect(manager.strategy).toBe('Break')
  expect(manager.leaderId).toBe('member-0')
})
it('keeps distinct stable slots after casualties for each catalog formation', () => {
  const manager = new SquadManager(), plan = wave(), target = { x: 0, z: 0 }
  manager.start(plan)
  for (const formation of ['V', 'Circle', 'LineDivers'] as const) {
    const positions = plan.enemies.map((e) => { manager.target({ ...e, formation }, 0, 0, target); return `${target.x}:${target.z}` })
    expect(new Set(positions).size).toBe(4)
  }
  manager.clear()
  expect(manager.leaderId).toBeNull()
})
