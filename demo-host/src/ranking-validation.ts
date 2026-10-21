import type { GameMode, RunSubmission } from '../../shared/rankings.ts'
import { RankingError } from './run-repository.ts'

const text = (value: unknown, max = 64): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
export function validateStart(body: unknown): { mode: GameMode; buildVersion: string; contentVersion: string } {
  if (!body || typeof body !== 'object' || !('mode' in body) || (body.mode !== 'normal' && body.mode !== 'survivor') || !('buildVersion' in body) || !text(body.buildVersion) || !('contentVersion' in body) || !text(body.contentVersion) || Object.keys(body).some((key) => !['mode', 'buildVersion', 'contentVersion'].includes(key))) throw new RankingError(400, 'invalid_start')
  return { mode: body.mode, buildVersion: body.buildVersion, contentVersion: body.contentVersion }
}

export function validateSubmission(body: unknown): RunSubmission {
  if (!body || typeof body !== 'object') throw new RankingError(400, 'invalid_submission')
  const row = body as Record<string, unknown>
  const keys = ['runId', 'token', 'mode', 'seed', 'buildVersion', 'contentVersion', 'score', 'kills', 'durationMs', 'endedAt', 'outcome', 'debugModified']
  const boundedInt = (v: unknown, max: number) => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= max
  if (Object.keys(row).some((key) => !keys.includes(key)) || !text(row.runId) || !text(row.token, 128) || (row.mode !== 'normal' && row.mode !== 'survivor') || !text(row.seed) || !text(row.buildVersion) || !text(row.contentVersion) || !boundedInt(row.score, 1_000_000_000) || !boundedInt(row.kills, 1_000_000) || !boundedInt(row.durationMs, 86400000) || !text(row.endedAt, 32) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.endedAt) || !Number.isFinite(Date.parse(row.endedAt)) || row.outcome !== 'dead' || typeof row.debugModified !== 'boolean') throw new RankingError(400, 'invalid_submission')
  if (new Date(row.endedAt as string).toISOString() !== row.endedAt) throw new RankingError(400, 'invalid_timestamp')
  return row as unknown as RunSubmission
}
