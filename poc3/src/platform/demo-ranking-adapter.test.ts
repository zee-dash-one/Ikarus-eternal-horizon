import { afterEach, describe, it, expect, vi } from 'vitest'
import { DemoRankingAdapter } from './demo-ranking-adapter.ts'

afterEach(() => vi.unstubAllGlobals())
describe('DemoRankingAdapter', () => {
  it('passes the period/mode and expected account over credentialed HTTP', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ rows: [], personalBest: null }))
    vi.stubGlobal('fetch', fetch)
    await new DemoRankingAdapter('user-1').fetchBoard('normal', 'annual')
    expect(fetch.mock.calls[0][0]).toBe('/api/rankings/board?mode=normal&period=annual')
    expect(new Headers(fetch.mock.calls[0][1].headers).get('X-Ikarus-User')).toBe('user-1')
    expect(fetch.mock.calls[0][1].credentials).toBe('include')
  })
  it('does not treat an expired session or missing service as a successful submission', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 404 }))
    vi.stubGlobal('fetch', fetch)
    const adapter = new DemoRankingAdapter('user-1')
    await expect(adapter.fetchBests()).rejects.toThrow(/expirou/)
    await expect(adapter.fetchBests()).rejects.toThrow(/recordes/)
  })
})
