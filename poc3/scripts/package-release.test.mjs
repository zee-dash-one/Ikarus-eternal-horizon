import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateReleaseEnv, makeZip, inspectBuild } from './package-release.mjs'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
test('release rejects absent/private credentials and local endpoints', () => {
  assert.throws(() => validateReleaseEnv({}), /BUILD_VERSION/)
  const env = { IKARUS_BUILD_VERSION: 'test-1', VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_configuration_example', VITE_API_URL: 'https://api.example.test' }
  assert.doesNotThrow(() => validateReleaseEnv(env))
  assert.throws(() => validateReleaseEnv({ ...env, VITE_API_URL: 'http://localhost:8787' }), /HTTPS/)
  assert.throws(() => validateReleaseEnv({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_allowed' }), /secret/)
})
test('standard ZIP preserves root names/data and rejects traversal', () => {
  const zip = makeZip([{ name: 'index.html', data: Buffer.from('hello') }])
  assert.equal(zip.readUInt32LE(0), 0x04034b50)
  assert.equal(zip.readUInt32LE(zip.length - 22), 0x06054b50)
  assert.equal(zip.readUInt16LE(zip.length - 12), 1)
  assert.ok(zip.includes(Buffer.from('index.html')))
  assert.throws(() => makeZip([{ name: '../private', data: Buffer.from('x') }]), /path/)
})
test('audit catches missing root assets, DEV routes and accidental private files', () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'ikarus-release-'))
  try {
    writeFileSync(path.join(folder, 'index.html'), '<script src="./game.js"></script>')
    assert.throws(() => inspectBuild(folder), /reference/)
    writeFileSync(path.join(folder, 'game.js'), 'console.log("game")')
    assert.equal(inspectBuild(folder).length, 2)
    writeFileSync(path.join(folder, 'game.js'), 'fetch("/api/auth/dev-email")')
    assert.throws(() => inspectBuild(folder), /DEV/)
  } finally { rmSync(folder, { recursive: true, force: true }) }
})
