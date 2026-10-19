import { fileURLToPath } from 'node:url'

export interface AppConfig {
  readonly profile: 'dev' | 'production'
  readonly secureCookies: boolean
  readonly allowedOrigins: readonly string[]
  readonly sessionTtlMs: number
}

export function readConfig(env: Record<string, string | undefined> = process.env, args = process.argv.slice(2)) {
  const requestedDev = args.includes('--dev') || env.IKARUS_PROFILE === 'dev'
  const profile = requestedDev && env.NODE_ENV !== 'production' ? 'dev' : 'production'
  const allowLocalHttp = profile === 'dev' && args.includes('--allow-local-http')
  const port = Number(env.PORT ?? 8787)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535')
  const allowedOrigins = (env.IKARUS_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value.trim()) throw new Error('Allowed origins must be exact HTTP(S) origins')
    return url.origin
  })
  return {
    profile, secureCookies: !allowLocalHttp, allowedOrigins,
    sessionTtlMs: 7 * 24 * 60 * 60 * 1000,
    port, hostname: '127.0.0.1',
    databasePath: env.IKARUS_DB_PATH ?? fileURLToPath(new URL('../data/ikarus-dev.sqlite', import.meta.url)),
  } satisfies AppConfig & { port: number; hostname: string; databasePath: string }
}
