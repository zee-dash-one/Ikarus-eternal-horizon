import type { RankingPeriod } from '../../shared/rankings.ts'

/** Calendar windows in UTC, always [start, next start). */
export function utcWindow(period: RankingPeriod, now: number): { startsAt: string | null; endsAt: string | null } {
  if (period === 'eternal') return { startsAt: null, endsAt: null }
  const date = new Date(now)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  let start: number
  let end: number
  if (period === 'weekly') {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7
    start = Date.UTC(year, month, date.getUTCDate() - daysSinceMonday)
    end = start + 7 * 86400000
  } else if (period === 'monthly') {
    start = Date.UTC(year, month, 1)
    end = Date.UTC(year, month + 1, 1)
  } else {
    start = Date.UTC(year, 0, 1)
    end = Date.UTC(year + 1, 0, 1)
  }
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() }
}
