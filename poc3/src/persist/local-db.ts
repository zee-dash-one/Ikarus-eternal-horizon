import Dexie, { type Table } from 'dexie'

export interface AchievementRow {
  apiName: string
  unlockedAt: number | null
}

export interface RankingMirrorRow {
  boardKey: string
  bestScore: number
  updatedAt: number
}

export interface StoreCacheRow {
  key: string
  payload: string
  updatedAt: number
}

export class LocalDb extends Dexie {
  achievements!: Table<AchievementRow, string>
  rankingMirrors!: Table<RankingMirrorRow, string>
  storeCache!: Table<StoreCacheRow, string>

  constructor() {
    super('ikarus_poc3')
    this.version(1).stores({
      achievements: 'apiName',
      rankingMirrors: 'boardKey',
      storeCache: 'key',
    })
  }
}

let dbInstance: LocalDb | null = null

export function getLocalDb(): LocalDb {
  if (!dbInstance) {
    dbInstance = new LocalDb()
  }
  return dbInstance
}
