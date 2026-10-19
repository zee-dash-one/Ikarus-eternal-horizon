import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const children = [
  spawn(process.execPath, ['src/index.ts', '--dev', '--allow-local-http'], { cwd: fileURLToPath(new URL('demo-host/', root)), stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { cwd: fileURLToPath(new URL('poc3/', root)), stdio: 'inherit' }),
]
let stopping = false
function stop(code) {
  if (stopping) return
  stopping = true
  process.exitCode = code
  for (const child of children) child.kill()
}
for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stop(1) })
  child.on('exit', (code) => stop(code ?? 0))
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
