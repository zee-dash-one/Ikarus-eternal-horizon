/** POC3 combat tuning. Planning, AI and cosmetics use separate random streams. */
export const DEFAULT_COMBAT = {
  entryTicks: 90, entryFromZ: 24,
  planningWavesPerFrame: 5,
  enemy: {
    gateTicks: 120, strategyTicks: 180, fleeChance: 0.15, furyChance: 0.45,
    speed: { Tanker: 9, Warrior: 12, Rogue: 16, Special: 10 },
    hp: { Tanker: 100, Warrior: 60, Rogue: 40, Special: 600 },
    shield: { Tanker: 20, Warrior: 10, Rogue: 0, Special: 150 },
    perSprintHp: 0.12, perWaveHp: 0.005, maxHpMultiplier: 8,
    radius: 1.2, bossRadius: 2.5, contactDamage: 35,
    fireTicks: 120, fireRange: 60, shotSpeed: 18, shotDamage: 12, shotRadius: 0.3, shotLifetime: 5, shotBudget: 64, shotColor: 0xff8040,
    maxLifeTicks: 1800, turnSpeed: 3,
  },
  squad: { groupingTicks: 150, patrolTicks: 300, loopTicks: 120, approachTicks: 240, breakTicks: 180, spacing: 3, radius: 6, standoff: 24, sweep: 12, followGain: 3, separation: 1.8 },
  meteor: { hp: { S: 40, M: 80, L: 160 }, contact: { S: 15, M: 30, L: 60 } },
  playerRadius: 0.8, contactGraceTicks: 45,
}
export type CombatBalance = typeof DEFAULT_COMBAT
