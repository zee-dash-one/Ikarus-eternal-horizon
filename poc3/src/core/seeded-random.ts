export function deriveSeed(...parts: readonly (string | number)[]): string {
  const source = JSON.stringify(parts)
  let hash = 2166136261
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16).padStart(8, '0')
}
/** Mulberry32: stable integer math, separate derived streams per domain/segment. */
export function seededRandom(seed: string): () => number {
  let state = Number.parseInt(deriveSeed(seed), 16)
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
export function freezeData<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeData(child)
    Object.freeze(value)
  }
  return value
}
export function requirePreparation(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Preparação inválida: ${message}`)
}
