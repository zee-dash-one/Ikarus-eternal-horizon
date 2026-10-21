import type { Rect, SpawnPoint } from '../core/run-plan.ts'
import { freezeData, requirePreparation } from '../core/seeded-random.ts'

export class SpawnPointManager {
  private _enemies: readonly SpawnPoint[] = []
  private _asteroids: readonly SpawnPoint[] = []
  constructor(readonly world: Rect, readonly safeEntry: Rect, readonly margin: number) {
    for (const rect of [world, safeEntry]) requirePreparation([rect.minX, rect.maxX, rect.minZ, rect.maxZ].every(Number.isFinite) && rect.minX < rect.maxX && rect.minZ < rect.maxZ, 'área inválida')
    requirePreparation(Number.isFinite(margin) && margin > 0, 'margem de spawn inválida')
    requirePreparation(safeEntry.minX >= world.minX && safeEntry.maxX <= world.maxX && safeEntry.minZ >= world.minZ && safeEntry.maxZ <= world.maxZ && safeEntry.minX <= 0 && safeEntry.maxX >= 0 && safeEntry.minZ <= 0 && safeEntry.maxZ >= 0, 'entrada segura deve conter a nave e caber no campo')
  }
  get enemies(): readonly SpawnPoint[] { return this._enemies }
  get asteroids(): readonly SpawnPoint[] { return this._asteroids }
  createEnemies(points: readonly SpawnPoint[]): void {
    requirePreparation(this._enemies.length === 0, 'registry de inimigos já criado')
    this._enemies = this._validate(points, this._asteroids)
  }
  createAsteroids(points: readonly SpawnPoint[]): void {
    requirePreparation(this._asteroids.length === 0, 'registry de asteroides já criado')
    this._asteroids = this._validate(points, this._enemies)
  }
  enemy(id: string): SpawnPoint { const point = this._enemies.find((row) => row.id === id); requirePreparation(point, `spawn de inimigo desconhecido: ${id}`); return point }
  asteroid(id: string): SpawnPoint { const point = this._asteroids.find((row) => row.id === id); requirePreparation(point, `spawn de asteroide desconhecido: ${id}`); return point }
  private _validate(points: readonly SpawnPoint[], other: readonly SpawnPoint[]): readonly SpawnPoint[] {
    requirePreparation(points.length > 0 && points.length <= 64, 'registry deve ter 1–64 pontos')
    const ids = new Set(other.map((point) => point.id))
    for (const point of points) {
      requirePreparation(point.id.length > 0 && !ids.has(point.id), `ID de spawn repetido: ${point.id}`)
      ids.add(point.id)
      const { position: p, halfExtents: h, direction: d } = point
      requirePreparation([p.x, p.z, h.x, h.z, d.x, d.z].every(Number.isFinite) && h.x > 0 && h.z > 0, `volume inválido: ${point.id}`)
      requirePreparation(Number.isSafeInteger(point.capacity) && point.capacity > 0 && point.capacity <= 128, `capacidade inválida: ${point.id}`)
      requirePreparation(Math.abs(Math.hypot(d.x, d.z) - 1) < 0.000001, `direção deve ser unitária: ${point.id}`)
      const w = this.world, s = this.safeEntry
      requirePreparation(p.x - h.x >= w.minX - this.margin && p.x + h.x <= w.maxX + this.margin && p.z - h.z >= w.minZ - this.margin && p.z + h.z <= w.maxZ + this.margin, `spawn fora do envelope: ${point.id}`)
      requirePreparation(p.x + h.x < s.minX || p.x - h.x > s.maxX || p.z + h.z < s.minZ || p.z - h.z > s.maxZ, `spawn invade entrada segura: ${point.id}`)
      requirePreparation(d.x * ((w.minX + w.maxX) / 2 - p.x) + d.z * ((w.minZ + w.maxZ) / 2 - p.z) > 0, `spawn deve apontar para o campo: ${point.id}`)
    }
    return freezeData(structuredClone(points))
  }
}
