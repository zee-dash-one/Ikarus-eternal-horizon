import { describe, it, expect } from 'vitest'
import { readConfig } from '../../../demo-host/src/config.ts'

/** ARCH-05 revised by D47: DEV is explicit; production requires configured real auth and durable storage.
 * Cookie/session persistence is integration-tested by demo-host/src/app.test.ts.
 */
describe('ARCH-05 — explicit DEV auth profile', () => {
  it('starts closed by default and ignores DEV request under NODE_ENV=production', () => {
    expect(readConfig({}, []).profile).toBe('production')
    expect(readConfig({}, ['--dev']).profile).toBe('dev')
    expect(() => readConfig({ NODE_ENV: 'production' }, ['--dev'])).toThrow(/Production requires/)
  })
  it('requires an explicit local HTTP option for insecure development cookies', () => {
    expect(readConfig({}, ['--dev']).secureCookies).toBe(true)
    expect(readConfig({}, ['--dev', '--allow-local-http']).secureCookies).toBe(false)
  })
})