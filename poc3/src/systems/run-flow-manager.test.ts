import { describe, it, expect, vi } from 'vitest'
import { RunFlowManager } from './run-flow-manager.ts'

describe('RunFlowManager', () => {
  it('adopts only READY and enforces explicit entry, transition and finish gates', async () => {
    const run = { dispose: vi.fn() }
    const flow = new RunFlowManager<typeof run>()
    let release!: (value: typeof run) => void
    const prepare = flow.prepare(async () => new Promise((resolve) => { release = resolve }))
    expect(flow.phase).toBe('PREPARING')
    expect(flow.enter()).toBeNull()
    expect(flow.completeEntry()).toBe(false)
    release(run)
    expect(await prepare).toBe(true)
    expect(flow.phase).toBe('READY')
    expect(flow.enter()).toBe(run)
    expect(flow.phase).toBe('ENTERING')
    expect(flow.enter()).toBeNull()
    expect(flow.completeEntry()).toBe(true)
    expect(flow.beginTransition()).toBe(true)
    expect(flow.phase).toBe('TRANSITION')
    expect(flow.completeTransition()).toBe(true)
    expect(flow.finish()).toBe(true)
    expect(flow.finish()).toBe(false)
    expect(flow.phase).toBe('FINISHED')
    flow.release(); flow.release()
    expect(run.dispose).toHaveBeenCalledOnce()
  })
  it('aborts cancellation and disposes a late result without replacing the next run', async () => {
    const old = { dispose: vi.fn() }, next = { dispose: vi.fn() }
    const flow = new RunFlowManager<typeof old>()
    let release!: (run: typeof old) => void
    let oldSignal!: AbortSignal
    const pending = flow.prepare(async (signal) => { oldSignal = signal; return new Promise((resolve) => { release = resolve }) })
    flow.cancel()
    expect(flow.phase).toBe('CANCELLED')
    expect(oldSignal.aborted).toBe(true)
    await flow.prepare(async () => next)
    release(old)
    expect(await pending).toBe(false)
    expect(old.dispose).toHaveBeenCalledOnce()
    expect(flow.context).toBe(next)
    expect(flow.phase).toBe('READY')
    flow.cancel(); flow.cancel()
    expect(next.dispose).toHaveBeenCalledOnce()
  })
  it('surfaces active preparation failure but ignores an aborted late failure', async () => {
    const flow = new RunFlowManager<{ dispose(): void }>()
    await expect(flow.prepare(async () => { throw new Error('assets failed') })).rejects.toThrow('assets failed')
    expect(flow.phase).toBe('CANCELLED')
    let reject!: (error: Error) => void
    const pending = flow.prepare(async () => new Promise((_resolve, fail) => { reject = fail }))
    flow.cancel()
    reject(new Error('late'))
    expect(await pending).toBe(false)
    expect(flow.context).toBeNull()
  })
})
