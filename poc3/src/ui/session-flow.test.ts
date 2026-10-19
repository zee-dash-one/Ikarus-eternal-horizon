import { describe, it, expect, vi } from 'vitest'
import { AuthManager } from '../systems/auth-manager.ts'
import { GameUiController } from './game-ui-controller.ts'
import { SessionFlow } from './session-flow.ts'
import type { ProfileRecord, ProfileStore } from '../persist/profile-store.ts'
import type { AuthPlatformAdapter, AuthSession } from '../platform/auth-types.ts'
import { createDefaultControlSettings } from '../persist/control-settings.ts'

function setup() {
  let session: AuthSession | null = null
  const adapter: AuthPlatformAdapter = {
    capabilities: { email: true, google: false, mock: true },
    probeSession: vi.fn(async () => session),
    signInWithEmail: vi.fn(async (email: string) => {
      session = { userId: email, displayName: 'Pilot', provider: 'mock' }
      return session
    }),
    signOut: vi.fn(async () => { session = null }),
  }
  const auth = new AuthManager()
  auth.setPlatformAdapter(adapter)
  const ui = new GameUiController()
  const rows = new Map<string, ProfileRecord>()
  const save = vi.fn(async (key: string, record: ProfileRecord) => { rows.set(key, record) })
  const store: ProfileStore = { load: vi.fn(async (key: string) => rows.get(key) ?? null), save }
  const apply = vi.fn()
  const ready = vi.fn()
  const clear = vi.fn()
  const flow = new SessionFlow({ auth, ui, createProfileStore: () => store, applyControls: apply, onReady: ready, onClear: clear })
  return { flow, auth, ui, adapter, rows, store, save, apply, ready, clear }
}

describe('DEV account lifecycle', () => {
  it('stays on Login when no session exists and normalizes email before loading profile', async () => {
    const t = setup()
    await t.flow.boot()
    expect(t.ui.loginVisible).toBe(true)
    expect(t.ready).not.toHaveBeenCalled()
    expect(t.store.load).not.toHaveBeenCalled()
    await t.flow.signIn(' PILOT@Example.com ')
    expect(t.adapter.signInWithEmail).toHaveBeenCalledWith('pilot@example.com')
    expect(t.apply).toHaveBeenCalledWith(createDefaultControlSettings())
    expect(t.ui.loginVisible).toBe(false)
    expect(t.ready).toHaveBeenCalledOnce()
  })
  it('releases busy after an API failure and Retry restores an existing session', async () => {
    const t = setup()
    vi.mocked(t.adapter.probeSession).mockRejectedValueOnce(new Error('Service unavailable'))
    await t.flow.boot()
    expect(t.ui.loginError).toContain('Service unavailable')
    expect(t.ui.loginBusy).toBe(false)
    expect(t.auth.session).toBeNull()
    await t.flow.signIn('pilot@example.com')
    vi.mocked(t.store.load).mockRejectedValueOnce(new Error('Settings unavailable'))
    await t.flow.boot()
    expect(t.ui.loginVisible).toBe(true)
    await t.flow.boot()
    expect(t.ui.loginVisible).toBe(false)
  })
  it('keeps failed saves for retry and flushes them before revoking/logout', async () => {
    const t = setup()
    await t.flow.signIn('pilot@example.com')
    const controls = { ...createDefaultControlSettings(), scheme: 'gamepad' as const }
    t.save.mockRejectedValueOnce(new Error('Disk busy'))
    await t.flow.saveControls(controls)
    expect(t.ui.accountError).toContain('Disk busy')
    await t.flow.signOut()
    expect(t.rows.get('controls')?.payload).toEqual(controls)
    expect(t.adapter.signOut).toHaveBeenCalledOnce()
    expect(t.ui.accountName).toBeNull()
    expect(t.ui.loginVisible).toBe(true)
    expect(t.auth.session).toBeNull()
    expect(t.clear).toHaveBeenCalled()
  })
  it('serializes saves, uses the most recent controls, and never starts twice for duplicate submit', async () => {
    const t = setup()
    let release!: () => void
    vi.mocked(t.adapter.signInWithEmail).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => { release = resolve })
      return { userId: 'pilot', displayName: 'Pilot', provider: 'mock' }
    })
    const first = t.flow.signIn('pilot@example.com')
    await t.flow.signIn('other@example.com')
    release()
    await first
    expect(t.adapter.signInWithEmail).toHaveBeenCalledTimes(1)
    const a = createDefaultControlSettings()
    const b = { ...a, scheme: 'touch' as const }
    await Promise.all([t.flow.saveControls(a), t.flow.saveControls(b)])
    expect(t.rows.get('controls')?.payload).toEqual(b)
  })
  it('does not pretend logout succeeded when the API fails and retries the correct operation', async () => {
    const t = setup()
    await t.flow.signIn('pilot@example.com')
    vi.mocked(t.adapter.signOut).mockRejectedValueOnce(new Error('Service unavailable'))
    await t.flow.signOut()
    expect(t.auth.session).not.toBeNull()
    expect(t.ui.accountBusy).toBe(false)
    expect(t.ui.accountError).toContain('Service unavailable')
    await t.flow.retryAccountAction()
    expect(t.auth.session).toBeNull()
    expect(t.ui.loginVisible).toBe(true)
  })
})
