import { describe, it, expect } from 'vitest'
import { utcWindow } from '../../../demo-host/src/ranking-periods.ts'

/** RNK-02 / D50: server UTC calendar windows, independent of local DST. */
describe('RNK-02 — UTC window boundaries', () => {
  it('changes the week exactly at Monday midnight', () => {
    const sunday = utcWindow('weekly', Date.parse('2026-10-18T23:59:59.999Z'))
    const monday = utcWindow('weekly', Date.parse('2026-10-19T00:00:00.000Z'))
    expect(sunday.endsAt).toBe(monday.startsAt)
    expect(monday.startsAt).toBe('2026-10-19T00:00:00.000Z')
  })
  it('starts a new month and year at the civil boundary and keeps eternal unbounded', () => {
    expect(utcWindow('monthly', Date.parse('2027-01-01T00:00:00Z')).startsAt).toBe('2027-01-01T00:00:00.000Z')
    expect(utcWindow('annual', Date.parse('2026-12-31T23:59:59.999Z')).endsAt).toBe('2027-01-01T00:00:00.000Z')
    expect(utcWindow('eternal', 0)).toEqual({ startsAt: null, endsAt: null })
  })
})
