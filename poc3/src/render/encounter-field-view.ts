import { BoxGeometry, ConeGeometry, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, OctahedronGeometry, SphereGeometry } from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { EncounterVisualBalance } from '../core/run-plan.ts'
import type { WorldSnapshot } from '../core/world-snapshot.ts'

/** Render capacity covers the validated maximum pool budget. No meshes created in sync. */
export class EncounterFieldView {
  readonly root = new Group()
  private readonly _shapes = { Tanker: new BoxGeometry(1, 0.7, 1.3), Warrior: new ConeGeometry(0.7, 1.5, 4), Rogue: new OctahedronGeometry(0.7), Special: new IcosahedronGeometry(1) }
  private readonly _sphere = new SphereGeometry(1, 8, 6)
  private readonly _materials
  private readonly _meteorMaterial: MeshBasicMaterial
  private readonly _boltMaterial = new MeshBasicMaterial({ color: BALANCE.combat.enemy.shotColor })
  private readonly _enemies: Mesh[] = []
  private readonly _meteors: Mesh[] = []
  private readonly _bolts: Mesh[] = []
  private readonly _drops: Mesh[] = []
  private readonly _dropMaterial = new MeshBasicMaterial({ color: BALANCE.economy.drops.color })
  private readonly _attackMaterial = new MeshBasicMaterial({ color: BALANCE.economy.profiles.beam.color, transparent: true, opacity: 0.25, wireframe: true })
  private readonly _attack = new Mesh(this._sphere, this._attackMaterial)
  constructor(private readonly _visuals: EncounterVisualBalance) {
    this._materials = { Tanker: new MeshBasicMaterial({ color: _visuals.enemyColors.Tanker }), Warrior: new MeshBasicMaterial({ color: _visuals.enemyColors.Warrior }), Rogue: new MeshBasicMaterial({ color: _visuals.enemyColors.Rogue }), Special: new MeshBasicMaterial({ color: _visuals.enemyColors.Special }) }
    this._meteorMaterial = new MeshBasicMaterial({ color: _visuals.asteroidColor })
    this._attack.visible = false; this.root.add(this._attack)
    for (let i = 0; i < BALANCE.economy.drops.budget; i++) {
      const drop = new Mesh(this._sphere, this._dropMaterial); drop.visible = false; drop.scale.setScalar(BALANCE.economy.drops.radius)
      this._drops.push(drop); this.root.add(drop)
    }
    for (let i = 0; i < 128; i++) {
      const enemy = new Mesh(this._shapes.Tanker, this._materials.Tanker), meteor = new Mesh(this._sphere, this._meteorMaterial)
      enemy.visible = meteor.visible = false
      this._enemies.push(enemy); this._meteors.push(meteor); this.root.add(enemy, meteor)
    }
    for (let i = 0; i < BALANCE.combat.enemy.shotBudget; i++) {
      const bolt = new Mesh(this._sphere, this._boltMaterial); bolt.visible = false; bolt.scale.setScalar(BALANCE.combat.enemy.shotRadius)
      this._bolts.push(bolt); this.root.add(bolt)
    }
  }
  warmup(): void { for (const mesh of this.root.children) mesh.visible = true }
  sync(snapshot: Pick<WorldSnapshot, 'tick' | 'enemies' | 'meteors' | 'hostileShots' | 'drops' | 'areaAttack'>): void {
    const enemies = snapshot.enemies ?? [], meteors = snapshot.meteors ?? [], bolts = snapshot.hostileShots ?? []
    for (let i = 0; i < this._enemies.length; i++) {
      const mesh = this._enemies[i], e = enemies[i]; if (!mesh) continue; mesh.visible = !!e
      if (!e) continue
      mesh.geometry = this._shapes[e.class]; mesh.material = this._materials[e.class]
      mesh.position.set(e.x, 0, e.z); mesh.rotation.set(e.class === 'Warrior' ? Math.PI / 2 : 0, e.rotY, 0)
      const size = this._visuals.enemySize
      mesh.scale.set(size.x, size.y, size.z).multiplyScalar(e.boss ? 2 : 1)
    }
    for (let i = 0; i < this._meteors.length; i++) {
      const mesh = this._meteors[i], m = meteors[i]; if (!mesh) continue; mesh.visible = !!m
      if (m) { mesh.position.set(m.x, 0, m.z); mesh.scale.setScalar(this._visuals.asteroidRadii[m.size]); mesh.rotation.set(snapshot.tick * 0.005, snapshot.tick * 0.007, 0) }
    }
    for (let i = 0; i < this._drops.length; i++) {
      const mesh = this._drops[i], drop = snapshot.drops?.[i]
      if (!mesh) continue
      mesh.visible = !!drop
      if (drop) mesh.position.set(drop.x, 0, drop.z)
    }
    const attack = snapshot.areaAttack
    this._attack.visible = !!attack
    if (attack) {
      const range = attack.kind === 'nova' ? BALANCE.economy.bomb.radius : attack.kind === 'beam' ? BALANCE.economy.profiles.beam.range : BALANCE.economy.profiles.mjolnir.range
      this._attack.position.set(attack.x, 0, attack.z - (attack.kind === 'nova' ? 0 : range / 2))
      this._attack.scale.set(attack.kind === 'nova' ? range : attack.kind === 'beam' ? BALANCE.economy.profiles.beam.width : range * Math.tan(BALANCE.economy.profiles.mjolnir.halfAngle), 0.4, attack.kind === 'nova' ? range : range / 2)
    }
    for (let i = 0; i < this._bolts.length; i++) {
      const mesh = this._bolts[i], b = bolts[i]; if (!mesh) continue; mesh.visible = !!b
      if (b) mesh.position.set(b.x, 0, b.z)
    }
  }
  dispose(): void {
    for (const geometry of Object.values(this._shapes)) geometry.dispose()
    for (const material of Object.values(this._materials)) material.dispose()
    this._dropMaterial.dispose(); this._attackMaterial.dispose(); this._sphere.dispose(); this._meteorMaterial.dispose(); this._boltMaterial.dispose(); this.root.clear(); this.root.removeFromParent()
  }
}
