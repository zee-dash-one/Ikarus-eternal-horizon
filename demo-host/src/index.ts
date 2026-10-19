import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { readConfig } from './config.ts'
import { LocalRepository } from './repository.ts'

const config = readConfig()
const repository = new LocalRepository(config.databasePath)
const app = createApp({ repository, config })
const server = serve({ fetch: app.fetch, port: config.port, hostname: config.hostname }, () => {
  console.log(`DemoHost (${config.profile}) http://${config.hostname}:${config.port}`)
})
function shutdown() {
  server.close(() => { repository.close(); process.exit(0) })
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
