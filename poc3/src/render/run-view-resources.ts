import { BoxGeometry, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { ParallaxLayerBalance } from '../core/balancer.ts'
import type { EncounterVisualBalance, PreparedRunView, StagedEncounter } from '../core/run-plan.ts'
import { requirePreparation } from '../core/seeded-random.ts'
import { ParallaxField } from './parallax-field.ts'
import { PlayerCraftView } from './player-craft-view.ts'
import { CraftRingsMesh } from './craft-rings-mesh.ts'
import { ShotFieldView } from './shot-field-view.ts'
import { playfieldToWorld } from '../core/playfield.ts'
import { EncounterFieldView } from './encounter-field-view.ts'

/** Allocated during PREPARING; RunScene adopts this same graph without rebuilding it. */
export class RunViewResources implements PreparedRunView {
  readonly root = new Group()
  readonly parallax: ParallaxField
  private _craft: PlayerCraftView | null = null
  private _rings: CraftRingsMesh | null = null
  private _shots: ShotFieldView | null = null
  private _encounter: EncounterFieldView | null = null
  private readonly _staged = new Group()
  private readonly _stagedMeshes: Mesh[] = []
  private _disposed = false
  private _ready = false
  constructor(layers: readonly ParallaxLayerBalance[], private readonly _compile: (root: Group) => void, private readonly _visuals: EncounterVisualBalance = BALANCE.preparation.visuals, cosmeticSeed = 'standalone') {
    this.root.name = 'prepared-run'
    this.parallax = new ParallaxField(layers, cosmeticSeed)
    this.root.add(this.parallax.root)
    this._staged.name = 'inactive-first-encounter'
    this._staged.visible = false
    this.root.add(this._staged)
  }
  get layerCount(): number { return this.parallax.layers.length }
  get stagedMeshCount(): number { return this._stagedMeshes.length }
  get ready(): boolean { return this._ready && !this._disposed }
  get craft(): PlayerCraftView { requirePreparation(this._craft, 'nave não preparada'); return this._craft }
  get rings(): CraftRingsMesh { requirePreparation(this._rings, 'HUD não preparado'); return this._rings }
  get shots(): ShotFieldView { requirePreparation(this._shots, 'projéteis não preparados'); return this._shots }
  get encounter(): EncounterFieldView { requirePreparation(this._encounter, 'encontro não preparado'); return this._encounter }
  warmup(encounter: StagedEncounter): void {
    requirePreparation(!this._disposed && !this._ready, 'assets já preparados/descartados')
    this._craft = new PlayerCraftView()
    this.root.add(this._craft.root)
    this._rings = new CraftRingsMesh()
    this.root.add(this._rings.root)
    this._shots = new ShotFieldView()
    this.root.add(this._shots.root)
    this._encounter = new EncounterFieldView(this._visuals)
    this.root.add(this._encounter.root)
    this._encounter.warmup()
    const { enemySize: size, enemyColors: colors } = this._visuals
    for (const enemy of encounter.enemies) {
      const mesh = new Mesh(new BoxGeometry(size.x, size.y, size.z), new MeshBasicMaterial({ color: colors[enemy.class] }))
      mesh.name = enemy.id
      const position = playfieldToWorld(enemy.position)
      mesh.position.set(position.x, position.y, position.z)
      this._stagedMeshes.push(mesh)
      this._staged.add(mesh)
    }
    for (const asteroid of encounter.asteroids) {
      const radius = this._visuals.asteroidRadii[asteroid.size]
      const mesh = new Mesh(new SphereGeometry(radius, 8, 6), new MeshBasicMaterial({ color: this._visuals.asteroidColor }))
      mesh.name = asteroid.id
      const position = playfieldToWorld(asteroid.position)
      mesh.position.set(position.x, position.y, position.z)
      this._stagedMeshes.push(mesh)
      this._staged.add(mesh)
    }
    this._staged.visible = true
    try { this._compile(this.root); this._ready = true }
    finally { this._staged.visible = false; this._encounter.sync({ tick: 0 }) }
  }
  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this._ready = false
    this.root.removeFromParent()
    this.parallax.dispose()
    this._craft?.dispose()
    this._rings?.dispose()
    this._shots?.dispose()
    this._encounter?.dispose()
    for (const mesh of this._stagedMeshes) {
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) material.dispose()
    }
    this._stagedMeshes.length = 0
    this._staged.clear()
    this.root.clear()
  }
}
