import { describe, expect, it } from 'vitest'
import { BALANCE } from '../balancer.ts'
import { ShipStatusTracker } from './char-sheet.ts'

describe('ShipStatusTracker', () => {
  const cd = BALANCE.player.cooldowns

  it('energizing is false while any pulse flag is active or on cooldown', () => {
    const status = new ShipStatusTracker()
    expect(status.energizing).toBe(true)

    status.setDashingActive(true, cd.dashingMs)
    expect(status.dashing).toBe(true)
    expect(status.energizing).toBe(false)

    status.setDashingActive(false, cd.dashingMs)
    expect(status.dashing).toBe(true)
    expect(status.energizing).toBe(false)
    status.tick(cd.dashingMs)
    expect(status.dashing).toBe(false)
    expect(status.energizing).toBe(true)
  })

  it('shooting stays true for shootingMs after fire release', () => {
    const status = new ShipStatusTracker()
    status.setShootingActive(true, cd.shootingMs)
    status.setShootingActive(false, cd.shootingMs)
    expect(status.shooting).toBe(true)
    expect(status.energizing).toBe(false)
    status.tick(cd.shootingMs - 1)
    expect(status.shooting).toBe(true)
    status.tick(2)
    expect(status.shooting).toBe(false)
    expect(status.energizing).toBe(true)
  })

  it('bombing lasts bombingMs after pulse', () => {
    const status = new ShipStatusTracker()
    status.pulseBombing(cd.bombingMs)
    expect(status.bombing).toBe(true)
    expect(status.energizing).toBe(false)
    status.tick(cd.bombingMs)
    expect(status.bombing).toBe(false)
    expect(status.energizing).toBe(true)
  })

  it('energizing stays false while any flag blocks regen', () => {
    const status = new ShipStatusTracker()
    status.pulseBombing(cd.bombingMs)
    status.setShootingActive(true, cd.shootingMs)
    expect(status.energizing).toBe(false)
    status.setShootingActive(false, cd.shootingMs)
    expect(status.energizing).toBe(false)
    status.tick(cd.shootingMs)
    expect(status.shooting).toBe(false)
    expect(status.bombing).toBe(true)
    expect(status.energizing).toBe(false)
  })
})
