import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { build, loadEnv } from 'vite'
import { assertPublicSupabaseConfig } from '../../shared/auth-config.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export function validateReleaseEnv(env) {
  if (!env.IKARUS_BUILD_VERSION || !/^[a-zA-Z0-9._-]{1,64}$/.test(env.IKARUS_BUILD_VERSION)) throw new Error('Set IKARUS_BUILD_VERSION before packaging.')
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY || !env.VITE_API_URL) throw new Error('Configure public Supabase credentials and VITE_API_URL before packaging.')
  assertPublicSupabaseConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  const url = new URL(env.VITE_API_URL)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) throw new Error('Release API must use a public HTTPS origin.')
}
function crc32(bytes) {
  let crc = -1
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ -1) >>> 0
}
/** Standard ZIP with deterministic headers. No shell/archive-tool dependency. */
export function makeZip(files) {
  const local = [], central = []
  let offset = 0
  for (const file of files) {
    if (file.name.startsWith('/') || file.name.split('/').includes('..') || file.name.includes('\\')) throw new Error('Invalid archive path.')
    const name = Buffer.from(file.name), data = Buffer.from(file.data), crc = crc32(data)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6); header.writeUInt16LE(0x21, 12)
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26)
    const directory = Buffer.alloc(46)
    directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0x800, 8); directory.writeUInt16LE(0x21, 14)
    directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(data.length, 20); directory.writeUInt32LE(data.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42)
    local.push(header, name, data); central.push(directory, name)
    offset += header.length + name.length + data.length
  }
  const table = Buffer.concat(central), end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(table.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, table, end])
}
export function inspectBuild(directory) {
  const files = []
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('Build contains a symlink.')
      const absolute = path.join(folder, entry.name)
      if (entry.isDirectory()) walk(absolute)
      else {
        const name = path.relative(directory, absolute).split(path.sep).join('/')
        if (entry.name.startsWith('.env') || name.endsWith('.sqlite') || name.endsWith('.map')) throw new Error('Private/source file in release: ' + name)
        const data = fs.readFileSync(absolute)
        if (name.endsWith('.js') && (/\/api\/auth\/dev-email/.test(data.toString()) || /sb_secret_[A-Za-z0-9_-]{20,}/.test(data.toString()))) throw new Error('DEV route or secret found in browser build.')
        files.push({ name, data })
      }
    }
  }
  walk(directory)
  const html = files.find((file) => file.name === 'index.html')
  if (!html) throw new Error('index.html must exist at archive root.')
  for (const match of html.data.toString().matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = match[1].split('?')[0]
    if (!ref.startsWith('./') || !files.some((file) => './' + file.name === ref)) throw new Error('Broken/non-relative root reference: ' + ref)
  }
  return files.sort((a, b) => a.name.localeCompare(b.name))
}
export async function packageRelease() {
  const env = { ...loadEnv('production', root, ''), ...process.env }
  validateReleaseEnv(env)
  if (process.argv.includes('--check')) { console.log('Release configuration valid.'); return }
  await build({ root, mode: 'production', build: { outDir: 'dist-release', emptyOutDir: true } })
  const files = inspectBuild(path.join(root, 'dist-release'))
  const manifest = { buildVersion: env.IKARUS_BUILD_VERSION, builtAt: new Date().toISOString(), files: files.map((file) => ({ path: file.name, bytes: file.data.length, sha256: createHash('sha256').update(file.data).digest('hex') })) }
  files.push({ name: 'release-manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2)) })
  const archive = makeZip(files), folder = path.join(root, 'releases')
  fs.mkdirSync(folder, { recursive: true })
  const name = 'ikarus-' + env.IKARUS_BUILD_VERSION + '.zip'
  fs.writeFileSync(path.join(folder, name), archive)
  fs.writeFileSync(path.join(folder, name + '.sha256'), createHash('sha256').update(archive).digest('hex') + '  ' + name + String.fromCharCode(10))
  console.log(JSON.stringify({ archive: name, bytes: archive.length, files: files.length }))
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await packageRelease()
