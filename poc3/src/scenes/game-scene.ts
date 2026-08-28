export interface GameScene {
  readonly id: string
  mount(): void
  update(dt: number): void
  syncRender(): void
  dispose(): void
}
