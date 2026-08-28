export interface Poolable {
  reset(): void
}

export class ObjectPool<T extends Poolable> {
  private readonly _factory: () => T
  private readonly _free: T[] = []
  private readonly _active = new Set<T>()
  private readonly _max: number

  constructor(factory: () => T, initialSize: number, maxSize: number) {
    this._factory = factory
    this._max = maxSize
    for (let i = 0; i < initialSize; i++) {
      this._free.push(factory())
    }
  }

  get activeCount(): number {
    return this._active.size
  }

  acquire(): T | null {
    if (this._active.size >= this._max) {
      return null
    }
    const item = this._free.pop() ?? this._factory()
    this._active.add(item)
    return item
  }

  release(item: T): void {
    if (!this._active.has(item)) {
      return
    }
    this._active.delete(item)
    item.reset()
    this._free.push(item)
  }

  releaseAll(): void {
    for (const item of this._active) {
      item.reset()
      this._free.push(item)
    }
    this._active.clear()
  }
}
