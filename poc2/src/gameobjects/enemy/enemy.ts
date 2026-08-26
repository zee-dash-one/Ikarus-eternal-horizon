/**
 * SDD-E01 Enemy — Warrior gunship (pooled).
 *
 * Two lives in one craft:
 *  - `birth`: scripted spawn → EnemyGate curve (unchanged reach animation).
 *  - squad life: steering agent on the gate plane. It seeks the slot its
 *    EnemyGroup reserved for it, hovers once settled, BOOSTs back when it drops
 *    out of formation, and can go rogue (FURY / FLEE) on deterministic triggers.
 *
 * Shots always leave along the smoothed nose heading, inside the fire cone.
 */

import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  ConeGeometry,
  DataTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
} from 'three'
import type { Texture } from 'three'
import { BALANCE } from '../../core/balancer'
import { DEG2RAD, clamp, damp, distXZ, lerp } from '../../core/math'
import { Layer, contactDamageFromIntegrity } from '../../systems/layers'
import type { ShotAcquirePort } from '../../systems/shot-manager'
import { EnemyMovementManager } from '../../systems/enemy-movement-manager'
import type { EnemyGroup } from '../../systems/enemy-group'
import type { AffinityTuning, SquadRegistryPort } from '../../systems/enemy-squad-manager'
import type { SquadConfig } from '../../systems/squad-config'
import {
  isInsideFireCone,
  isRogueState,
  type ShipAiState,
} from '../../systems/enemy-strategy'
import {
  addArrive,
  addAvoidRogue,
  addContainmentX,
  addSeek,
  addSeparation,
  clampSpeed,
  resetAcc,
  truncate,
  type SteerAcc,
} from '../../systems/steering'
import type { ReachPreviewSide } from '../../systems/reach-path'
import type { ShotSpawn } from '../shot/weapon-shot'
import {
  cloneWarriorSheet,
  warriorAgilityLambda,
  warriorEngageRange,
  warriorMaxForce,
  warriorMaxSpeed,
  type EditableWarriorSheet,
  type WarriorSheet,
} from './warrior'

export type TeamId = 'player' | 'enemy'

export interface SeekTargetPort {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface EnemySpawn {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly sheet?: WarriorSheet | EditableWarriorSheet
  readonly gateEntryOffsetX?: number
  readonly pathSide?: ReachPreviewSide
}

export interface EnemyOptions {
  readonly geometry: BoxGeometry
  readonly seekTarget: SeekTargetPort
  readonly gateTarget: SeekTargetPort
  readonly shots?: ShotAcquirePort
  readonly squad?: SquadRegistryPort
}

export interface EnemyStatusSnapshot {
  hitted: boolean
  hitting: boolean
  in_range: boolean
  passed_opponent: boolean
  aiState: ShipAiState
  groupId: number
  slotIndex: number
  shield: number
  shieldMax: number
}

/** Below this the craft is considered parked and keeps its previous nose. */
const MIN_HEADING_SPEED = 0.05
const GROUP_LABEL_Y = 1.4
const GROUP_LABEL_SCALE = 2.2
const GROUP_LABEL_CACHE = new Map<string, Texture>()

/** Unit-cube gunship silhouette. Parent Mesh is scaled to 2×radius (hitbox cube). */
const ENEMY_FUSELAGE_GEO = new BoxGeometry(0.38, 0.22, 0.72)
const ENEMY_WING_GEO = new BoxGeometry(0.92, 0.07, 0.28)
const ENEMY_TAIL_GEO = new BoxGeometry(0.06, 0.28, 0.18)
const ENEMY_NOSE_GEO = new ConeGeometry(0.12, 0.28, 4)
ENEMY_NOSE_GEO.rotateX(-Math.PI / 2)

function groupLabelTexture(text: string): Texture {
  const cached = GROUP_LABEL_CACHE.get(text)
  if (cached) {
    return cached
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128)
      ctx.font = 'bold 72px Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 8
      ctx.strokeStyle = '#000000'
      ctx.strokeText(text, 64, 64)
      ctx.fillStyle = '#f8fafc'
      ctx.fillText(text, 64, 64)
      const texture = new CanvasTexture(canvas)
      texture.needsUpdate = true
      GROUP_LABEL_CACHE.set(text, texture)
      return texture
    }
  }
  const data = new Uint8Array([255, 255, 255, 255])
  const texture = new DataTexture(data, 1, 1)
  texture.needsUpdate = true
  GROUP_LABEL_CACHE.set(text, texture)
  return texture
}

export class Enemy extends Mesh {
  readonly team: TeamId = 'enemy'
  readonly layer = Layer.Enemy
  active = false
  hp = 0
  hpMax = 0
  shield = 0
  shieldMax = 0
  x = 0
  y = 0
  z = 0
  vx = 0
  vz = 0
  radius = 0
  /** One slot per group id; written by the squad affinity tick. */
  readonly affinity: Float32Array
  readonly vehicle = {
    position: { x: 0, y: 0, z: 0 },
    maxSpeed: 0,
    update(dt: number): void {
      void dt
    },
  }

  private readonly _seek: SeekTargetPort
  private readonly _gate: SeekTargetPort
  private readonly _shots: ShotAcquirePort | null
  private readonly _squad: SquadRegistryPort | null
  private readonly _hitboxMat: MeshBasicMaterial
  private readonly _bodyMat: MeshBasicMaterial
  private readonly _rangeMat: MeshBasicMaterial
  private readonly _rangeMesh: Mesh
  private readonly _groupLabelMat: SpriteMaterial
  private readonly _groupLabel: Sprite
  private _groupLabelKey = ''
  private readonly _movement = new EnemyMovementManager()
  private readonly _pos = { x: 0, y: 0, z: 0 }
  private readonly _acc: SteerAcc = { x: 0, z: 0 }
  private readonly _vel: SteerAcc = { x: 0, z: 0 }
  private readonly _slotWorld = { x: 0, z: 0 }
  private readonly _gateAim = { x: 0, y: 0, z: 0 }
  private _killed = false
  private _dying = false
  private _aiState: ShipAiState = 'birth'
  private _cruiseSpeed = 0
  private _currentSpeed = 0
  private _reachSpeedMul = 3
  private _agilityLambda = 3.5
  private _intelligence = 60
  private _fireAcc = 0
  private _sheet: EditableWarriorSheet = cloneWarriorSheet(BALANCE.enemy.warrior)
  private _entryOffsetX = 0
  private _pathSide: ReachPreviewSide = 'front'

  private _group: EnemyGroup | null = null
  private _slotIndex = -1
  private _slotSeeded = false
  private _slotLocalX = 0
  private _slotLocalZ = 0
  private _offsetX = 0
  private _offsetZ = 0
  private _hoverPhase = 0
  private _hoverT = 0

  private _hittedMs = 0
  private _hittingMs = 0
  private _inRange = false
  private _passedOpponent = false
  private _proximityMs = 0
  private _hitStreak = 0
  private _hitStreakMs = 0
  /** Locked FLEE side: −1 left, +1 right, 0 unset. */
  private _fleeSide = 0
  private _rand: () => number = Math.random

  constructor(options: EnemyOptions) {
    const hitbox = BALANCE.debug.hitbox
    const hitboxMat = new MeshBasicMaterial({
      color: hitbox.color,
      wireframe: true,
      transparent: true,
      opacity: hitbox.opacity,
      depthWrite: false,
    })
    super(options.geometry, hitboxMat)
    this._hitboxMat = hitboxMat
    this._bodyMat = new MeshBasicMaterial({
      color: BALANCE.enemy.warrior.color,
      transparent: true,
      opacity: 1,
    })
    this._seek = options.seekTarget
    this._gate = options.gateTarget
    this._shots = options.shots ?? null
    this._squad = options.squad ?? null
    this.affinity = new Float32Array(Math.max(1, BALANCE.enemy.squad.maxGroups))

    const body = new Group()
    body.name = 'enemy.body'
    const fuselage = new Mesh(ENEMY_FUSELAGE_GEO, this._bodyMat)
    fuselage.name = 'enemy.fuselage'
    const wings = new Mesh(ENEMY_WING_GEO, this._bodyMat)
    wings.name = 'enemy.wings'
    wings.position.y = -0.04
    const tail = new Mesh(ENEMY_TAIL_GEO, this._bodyMat)
    tail.name = 'enemy.tail'
    tail.position.set(0, 0.12, 0.3)
    const nose = new Mesh(ENEMY_NOSE_GEO, this._bodyMat)
    nose.name = 'enemy.nose'
    nose.position.z = -0.5
    body.add(fuselage, wings, tail, nose)
    this.add(body)

    const rangeGeo = new CircleGeometry(1, 48)
    rangeGeo.rotateX(-Math.PI / 2)
    this._rangeMat = new MeshBasicMaterial({
      color: BALANCE.enemy.warrior.status.rangeColor,
      transparent: true,
      opacity: BALANCE.enemy.warrior.status.rangeOpacity,
      depthWrite: false,
      side: DoubleSide,
    })
    this._rangeMesh = new Mesh(rangeGeo, this._rangeMat)
    this._rangeMesh.name = 'enemy.range'
    this._rangeMesh.visible = false
    this.add(this._rangeMesh)

    this._groupLabelMat = new SpriteMaterial({
      map: groupLabelTexture('-'),
      transparent: true,
      depthWrite: false,
    })
    this._groupLabel = new Sprite(this._groupLabelMat)
    this._groupLabel.name = 'enemy.groupLabel'
    this._groupLabel.position.set(0, GROUP_LABEL_Y, 0)
    this._groupLabel.scale.set(GROUP_LABEL_SCALE, GROUP_LABEL_SCALE, 1)
    this._groupLabel.frustumCulled = false
    this._groupLabel.visible = false
    this._groupLabelKey = '-'
    this.add(this._groupLabel)

    this.visible = false
  }

  aiState(): ShipAiState {
    return this._aiState
  }

  currentSpeed(): number {
    return this._currentSpeed
  }

  get contactDamage(): number {
    return contactDamageFromIntegrity(this.hp, BALANCE.collision.contactIntegrityFrac)
  }

  sheet(): EditableWarriorSheet {
    return this._sheet
  }

  facingY(): number {
    return this._movement.facingY()
  }

  statusSnapshot(): EnemyStatusSnapshot {
    return {
      hitted: this._hittedMs > 0,
      hitting: this._hittingMs > 0,
      in_range: this._inRange,
      passed_opponent: this._passedOpponent,
      aiState: this._aiState,
      groupId: this._group?.id ?? -1,
      slotIndex: this._slotIndex,
      shield: this.shield,
      shieldMax: this.shieldMax,
    }
  }

  /* ---- SquadShipPort ------------------------------------------------- */

  isRogue(): boolean {
    return isRogueState(this._aiState)
  }

  isFury(): boolean {
    return this._aiState === 'fury'
  }

  currentGroup(): EnemyGroup | null {
    return this._group
  }

  affinityTuning(): AffinityTuning {
    return this._sheet.affinity
  }

  slotIndex(): number {
    return this._slotIndex
  }

  /** The group hands out (or revokes) a slot id; never a pose. */
  assignSlot(group: EnemyGroup | null, index: number): void {
    this._group = group
    this._slotIndex = index
    if (!group || index < 0) {
      this._slotSeeded = false
      return
    }
    if (!this._slotSeeded) {
      this._slotLocalX = group.slotOffsetX(index)
      this._slotLocalZ = group.slotOffsetZ(index)
      this._slotSeeded = true
    }
  }

  onMigrationStart(): void {
    if (this.isRogue()) {
      return
    }
    this._aiState = 'migrating'
  }

  /* -------------------------------------------------------------------- */

  /** Live-apply sheet combat stats without resetting pose / state (debugger). */
  applyLiveSheet(sheet: WarriorSheet | EditableWarriorSheet): void {
    if (!this.active) {
      return
    }
    const ratio = this.hpMax > 0 ? this.hp / this.hpMax : 1
    this._sheet = cloneWarriorSheet(sheet)
    this.hpMax = sheet.hp
    this.hp = Math.max(0, Math.min(sheet.hp, sheet.hp * ratio))
    this.shieldMax = sheet.shieldMax
    this.shield = Math.min(this.shield, this.shieldMax)
    this.radius = sheet.radius
    this._sheet.maxSpeed = warriorMaxSpeed(sheet.agility)
    this._sheet.maxForce = warriorMaxForce(sheet.agility)
    this._cruiseSpeed = this._sheet.maxSpeed
    this.vehicle.maxSpeed = this._cruiseSpeed
    this._reachSpeedMul = sheet.reachSpeedMul
    this._agilityLambda = warriorAgilityLambda(sheet.agility)
    this._intelligence = sheet.intelligence
    this._bodyMat.color.setHex(sheet.color)
    this.scale.setScalar(this.radius * 2)
    this._movement.setTurnRate(this._sheet.turnRateDeg)
    this._syncRangeVisual()
  }

  archetype(): string {
    return this._sheet.id
  }

  get dying(): boolean {
    return this._dying
  }

  activate(spawn: EnemySpawn): void {
    const sheet = cloneWarriorSheet(spawn.sheet ?? BALANCE.enemy.warrior)
    this._sheet = sheet
    this.hpMax = sheet.hp
    this.hp = this.hpMax
    this.shieldMax = sheet.shieldMax
    this.shield = this.shieldMax
    this.radius = sheet.radius
    this._sheet.maxSpeed = warriorMaxSpeed(sheet.agility)
    this._sheet.maxForce = warriorMaxForce(sheet.agility)
    this._cruiseSpeed = this._sheet.maxSpeed
    this.vehicle.maxSpeed = this._cruiseSpeed
    this._reachSpeedMul = sheet.reachSpeedMul
    this._agilityLambda = warriorAgilityLambda(sheet.agility)
    this._intelligence = sheet.intelligence
    this._entryOffsetX = spawn.gateEntryOffsetX ?? 0
    this._pathSide = spawn.pathSide ?? 'front'
    this._aiState = sheet.targets[0] === 'enemyGate' ? 'birth' : 'formation'
    this._currentSpeed = this._cruiseSpeed * this._reachSpeedMul
    this._fireAcc = 0
    this._hittedMs = 0
    this._hittingMs = 0
    this._inRange = false
    this._passedOpponent = false
    this._proximityMs = 0
    this._hitStreak = 0
    this._hitStreakMs = 0
    this._fleeSide = 0
    this._group = null
    this._slotIndex = -1
    this._slotSeeded = false
    this._slotLocalX = 0
    this._slotLocalZ = 0
    this._hoverT = 0
    this._hoverPhase = this._rand() * Math.PI * 2
    this.affinity.fill(0)
    this._rollImperfection()
    this.x = spawn.x
    this.y = spawn.y
    this.z = spawn.z
    this.vx = 0
    this.vz = 0
    this.vehicle.position.x = spawn.x
    this.vehicle.position.y = spawn.y
    this.vehicle.position.z = spawn.z
    this.active = true
    this._killed = false
    this._dying = false
    this.visible = true
    this._bodyMat.opacity = 1
    this._bodyMat.color.setHex(sheet.color)
    this.scale.setScalar(this.radius * 2)
    this._movement.reset()
    this._movement.setTurnRate(sheet.turnRateDeg)
    this._syncRangeVisual()

    if (this._aiState === 'birth') {
      const aim = this._refreshGateAim()
      this._movement.beginBirth(
        { x: spawn.x, y: spawn.y, z: spawn.z },
        { x: aim.x, y: aim.y, z: aim.z },
        this._cruiseSpeed * this._reachSpeedMul,
        this._pathSide,
        this._cruiseSpeed,
      )
    } else {
      this._joinSquad()
    }
  }

  deactivate(): void {
    this._squad?.unregister(this)
    this.active = false
    this.visible = false
    this.hp = 0
    this.shield = 0
    this._killed = false
    this._dying = false
    this._aiState = 'birth'
    this._currentSpeed = 0
    this._fireAcc = 0
    this._entryOffsetX = 0
    this._pathSide = 'front'
    this._hittedMs = 0
    this._hittingMs = 0
    this._inRange = false
    this._passedOpponent = false
    this._proximityMs = 0
    this._hitStreak = 0
    this._hitStreakMs = 0
    this._fleeSide = 0
    this._group = null
    this._slotIndex = -1
    this._slotSeeded = false
    this.vx = 0
    this.vz = 0
    this._rangeMesh.visible = false
    this._groupLabel.visible = false
    this._movement.reset()
  }

  gateEntryOffsetX(): number {
    return this._entryOffsetX
  }

  /** Called when this enemy takes damage (player shot). */
  notifyHitted(): void {
    this._hittedMs = Math.max(this._hittedMs, this._sheet.status.hittedCdMs)
  }

  /** Called when this enemy deals contact / opens fire. */
  notifyHitting(): void {
    this._hittingMs = Math.max(this._hittingMs, this._sheet.status.hittingCdMs)
  }

  update(dt: number): void {
    if (this._dying) {
      return
    }
    if (!this.active) {
      return
    }

    this._tickStatus(dt)

    if (this._aiState === 'birth') {
      this._updateBirth(dt)
    } else {
      this._updateSquad(dt)
    }

    this.vehicle.position.x = this.x
    this.vehicle.position.y = this.y
    this.vehicle.position.z = this.z

    this._tryFire(dt)
  }

  syncRender(): void {
    if (this._dying) {
      this.position.set(this.x, this.y, this.z)
      this._rangeMesh.visible = false
      this._groupLabel.visible = false
      this.visible = true
      return
    }
    if (!this.active) {
      this.visible = false
      return
    }
    this.position.set(this.x, this.y, this.z)
    this.rotation.y = this._movement.facingY()
    this._bodyMat.opacity = this.hpMax > 0 ? clamp(this.hp / this.hpMax, 0.2, 1) : 0.2
    this._rangeMesh.visible = this._sheet.status.rangeVisible
    this._syncGroupLabel()
    this.visible = true
  }

  takeDamage(amount: number): void {
    this.applyDamage(amount, 0)
  }

  applyDamage(
    amount: number,
    source: number,
  ): {
    absorbedByShield: number
    dealtToHull: number
    shieldBroke: boolean
    hullLevelChanged: boolean
    destroyed: boolean
    killed: boolean
  } {
    void source
    if (!this.active || this._killed) {
      return {
        absorbedByShield: 0,
        dealtToHull: 0,
        shieldBroke: false,
        hullLevelChanged: false,
        destroyed: false,
        killed: false,
      }
    }
    const dealt = Math.max(0, amount)
    if (dealt > 0) {
      this.notifyHitted()
    }

    let absorbed = 0
    let shieldBroke = false
    let remaining = dealt
    if (this.shield > 0) {
      absorbed = Math.min(this.shield, remaining)
      this.shield -= absorbed
      remaining -= absorbed
      if (this.shield <= 0) {
        this.shield = 0
        shieldBroke = true
      }
    }

    this._registerHitStreak(shieldBroke)
    this.hp -= remaining
    if (this.hp <= 0) {
      this.hp = 0
      this._killed = true
      this._dying = true
      this.active = false
      this.visible = true
      this._squad?.unregister(this)
      return {
        absorbedByShield: absorbed,
        dealtToHull: remaining,
        shieldBroke,
        hullLevelChanged: false,
        destroyed: false,
        killed: true,
      }
    }
    if (shieldBroke) {
      this._enterRogue('flee')
    }
    return {
      absorbedByShield: absorbed,
      dealtToHull: remaining,
      shieldBroke,
      hullLevelChanged: false,
      destroyed: false,
      killed: false,
    }
  }

  isOffField(): boolean {
    const box = BALANCE.enemy.despawn
    return Math.abs(this.x) > box.halfX || this.z > box.zNear || this.z < box.zFar
  }

  isOutsideBattleField(bounds: {
    readonly minX: number
    readonly maxX: number
    readonly minZ: number
    readonly maxZ: number
  }): boolean {
    return this.x < bounds.minX || this.x > bounds.maxX || this.z < bounds.minZ || this.z > bounds.maxZ
  }

  dispose(): void {
    this.deactivate()
    this._hitboxMat.dispose()
    this._bodyMat.dispose()
    this._rangeMesh.geometry.dispose()
    this._rangeMat.dispose()
    this._groupLabelMat.dispose()
  }

  /* ---- birth ---------------------------------------------------------- */

  private _updateBirth(dt: number): void {
    const rush = this._cruiseSpeed * this._reachSpeedMul

    this._pos.x = this.x
    this._pos.y = this.y
    this._pos.z = this.z
    const aim = this._refreshGateAim()
    const { arrived } = this._movement.updateBirth({
      position: this._pos,
      dt,
      target: aim,
      agilityLambda: this._agilityLambda,
    })
    this.x = this._pos.x
    this.y = this._pos.y
    this.z = this._pos.z
    this._currentSpeed = lerp(rush, this._cruiseSpeed, this._movement.birthProgress())
    this.vehicle.maxSpeed = this._currentSpeed

    if (arrived) {
      this._currentSpeed = this._cruiseSpeed
      this.vehicle.maxSpeed = this._currentSpeed
      const heading = this._movement.facingY()
      this.vx = Math.sin(heading) * this._currentSpeed
      this.vz = Math.cos(heading) * this._currentSpeed
      this._joinSquad()
    }
  }

  private _joinSquad(): void {
    this._aiState = 'formation'
    this._squad?.register(this)
  }

  /* ---- squad life ----------------------------------------------------- */

  private _updateSquad(dt: number): void {
    if (dt <= 0) {
      return
    }
    const cfg = this._squad?.liveConfig() ?? BALANCE.enemy.squad
    const boosting = this._aiState === 'boost' || this._aiState === 'migrating'
    const agilityMul = this._agilityMultiplier()
    const maxForce = Math.max(0.1, this._sheet.maxForce * agilityMul)
    const acc = this._acc
    resetAcc(acc)

    let speedMul = 1
    if (this._aiState === 'fury') {
      this._steerFury(acc, cfg, agilityMul)
    } else if (this._aiState === 'flee') {
      this._steerFlee(acc, cfg, agilityMul)
    } else {
      speedMul = this._steerFormation(acc, cfg, dt, boosting, agilityMul)
      addContainmentX(
        acc,
        this.x,
        this._arenaMinX(),
        this._arenaMaxX(),
        cfg.containmentInsetX,
        cfg.containmentExp,
        cfg.containmentWeight,
      )
    }

    truncate(acc, maxForce)

    const vel = this._vel
    vel.x = this.vx + acc.x * dt
    vel.z = this.vz + acc.z * dt
    clampSpeed(vel, this._cruiseSpeed * agilityMul * speedMul)
    this.vx = vel.x
    this.vz = vel.z

    this.x += this.vx * dt
    this.z += this.vz * dt
    this.y = damp(this.y, this._gate.y, this._agilityLambda, dt)

    this._currentSpeed = Math.hypot(this.vx, this.vz)
    this.vehicle.maxSpeed = this._currentSpeed
    if (this._currentSpeed > MIN_HEADING_SPEED) {
      this._movement.turnToward(Math.atan2(this.vx, this.vz), dt, this._agilityLambda)
    }

    // Triggers run on the freshly integrated pose (and a valid slot target).
    this._tickTriggers(dt)
  }

  /**
   * Slot arrive + hover + local traffic. Returns the curvature speed multiplier
   * that keeps outer ships synchronised through the group's turns.
   */
  private _steerFormation(
    acc: SteerAcc,
    cfg: SquadConfig,
    dt: number,
    boosting: boolean,
    agilityMul: number,
  ): number {
    const group = this._group
    if (!group || this._slotIndex < 0) {
      // Slot-less craft keeps descending until the squad hands out a slot.
      addSeek(
        acc,
        this.x,
        this.z,
        this.x,
        this.z + Math.max(cfg.patrolAdvanceMin, 1),
        this.vx,
        this.vz,
        this._cruiseSpeed * agilityMul,
      )
      return 1
    }

    const form = this._sheet.formation
    this._slotLocalX = damp(
      this._slotLocalX,
      group.slotOffsetX(this._slotIndex) + this._offsetX,
      cfg.slotLerpRate,
      dt,
    )
    this._slotLocalZ = damp(
      this._slotLocalZ,
      group.slotOffsetZ(this._slotIndex) + this._offsetZ,
      cfg.slotLerpRate,
      dt,
    )

    const settled = !boosting
    const hover = settled
      ? Math.sin(this._hoverPhase + this._hoverT * Math.PI * 2 * form.hoverHz) * form.hoverAmp
      : 0
    group.localToWorld(this._slotLocalX + hover, this._slotLocalZ, this._slotWorld)

    addArrive(
      acc,
      this.x,
      this.z,
      this._slotWorld.x,
      this._slotWorld.z,
      this.vx,
      this.vz,
      this._cruiseSpeed * agilityMul,
      Math.max(0.1, form.slotTolerance * 2),
    )

    if (!boosting) {
      this._addLocalTraffic(acc, cfg, group)
    }

    const base = Math.max(0.1, this._cruiseSpeed * agilityMul)
    const delta = (-this._slotLocalX * group.omega) / base
    return 1 + clamp(delta, -0.5, 0.75) * cfg.curvatureScale
  }

  /** Formation ships give way: mates keep spacing, rogues get a wide berth. */
  private _addLocalTraffic(acc: SteerAcc, cfg: SquadConfig, group: EnemyGroup): void {
    const mates = group.memberCount()
    for (let i = 0; i < mates; i += 1) {
      const mate = group.memberAt(i)
      if (!mate || mate === this) {
        continue
      }
      addSeparation(
        acc,
        this.x,
        this.z,
        mate.x,
        mate.z,
        cfg.shipSeparationRadius,
        cfg.shipSeparationWeight,
      )
    }
    const squad = this._squad
    if (!squad) {
      return
    }
    const rogues = squad.rogueCount()
    for (let i = 0; i < rogues; i += 1) {
      const rogue = squad.rogueAt(i)
      if (!rogue || rogue === this) {
        continue
      }
      addAvoidRogue(
        acc,
        this.x,
        this.z,
        rogue.x,
        rogue.z,
        rogue.vx,
        rogue.vz,
        cfg.rogueAvoidRadius,
        cfg.rogueAvoidWeight,
      )
    }
  }

  /**
   * Solo peel-off: always rush the player and keep going past them on +Z.
   * Never aims exactly at playerZ (that parked ships on an imaginary line).
   * Continues until BattleField cull removes the craft.
   */
  private _steerFury(acc: SteerAcc, cfg: SquadConfig, agilityMul: number): void {
    const speed = this._cruiseSpeed * agilityMul
    const push = Math.max(cfg.egressZMin, cfg.egressZMax * 0.5, 12)
    // Home on the player's X, but always target a point past them (and past us).
    const targetZ = Math.max(this._seek.z + push, this.z + push)
    addSeek(
      acc,
      this.x,
      this.z,
      this._seek.x,
      targetZ,
      this.vx,
      this.vz,
      speed,
    )
  }

  /** Diagonal peel: locked X-edge plus a point behind the ship (−Z, toward spawn). */
  private _steerFlee(acc: SteerAcc, cfg: SquadConfig, agilityMul: number): void {
    const speed = this._cruiseSpeed * agilityMul
    const side = this._fleeSide === 0 ? this._pickFleeSide() : this._fleeSide
    const pad = Math.max(0, cfg.fleeEdgePaddingX)
    const edgeX = side >= 0 ? this._arenaMaxX() + pad : this._arenaMinX() - pad
    const backZ = this.z - Math.max(1, cfg.fleeBackZ)
    addSeek(acc, this.x, this.z, edgeX, backZ, this.vx, this.vz, speed)
  }

  private _pickFleeSide(): number {
    const dx = this.x - this._seek.x
    if (dx > 0.25) {
      return 1
    }
    if (dx < -0.25) {
      return -1
    }
    return this.x >= 0 ? 1 : -1
  }

  private _agilityMultiplier(): number {
    if (this._aiState === 'fury') {
      return Math.max(1, this._sheet.morale.furyAgilityMul)
    }
    if (this._aiState === 'flee') {
      return Math.max(1, this._sheet.morale.fleeAgilityMul)
    }
    if (this._aiState === 'boost' || this._aiState === 'migrating') {
      return Math.max(1, this._sheet.formation.boostAgilityMul)
    }
    return 1
  }

  /** Deterministic state transitions: BOOST distance, FURY and FLEE triggers. */
  private _tickTriggers(dt: number): void {
    const dtMs = dt * 1000
    this._hoverT += dt
    if (this._hitStreakMs > 0) {
      this._hitStreakMs = Math.max(0, this._hitStreakMs - dtMs)
      if (this._hitStreakMs === 0) {
        this._hitStreak = 0
      }
    }

    if (this.isRogue()) {
      return
    }

    const morale = this._sheet.morale
    const toPlayer = distXZ(this.x, this.z, this._seek.x, this._seek.z)
    if (toPlayer <= morale.furyProximityRadius) {
      this._proximityMs += dtMs
      if (this._proximityMs >= morale.furyProximitySec * 1000) {
        this._enterRogue('fury')
        return
      }
    } else {
      this._proximityMs = 0
    }

    const group = this._group
    if (group) {
      const ratio = group.healthRatio()
      if (group.isLastSurvivor(this) || ratio * 100 < morale.fleeGroupHealthPct) {
        this._enterRogue('flee')
        return
      }
    }

    if (this._slotIndex < 0 || !group) {
      return
    }
    const form = this._sheet.formation
    const toSlot = distXZ(this.x, this.z, this._slotWorld.x, this._slotWorld.z)
    if (this._aiState === 'formation' && toSlot > form.boostDistance) {
      this._aiState = 'boost'
      return
    }
    if (
      (this._aiState === 'boost' || this._aiState === 'migrating') &&
      toSlot <= form.slotTolerance
    ) {
      this._aiState = 'formation'
    }
  }

  private _enterRogue(state: 'fury' | 'flee'): void {
    if (this.isRogue() || this._aiState === 'birth') {
      return
    }
    if (state === 'fury' && this._squad && !this._squad.canEnterFury()) {
      // Cap full — stay in formation; proximity/retaliation can retry next frames.
      return
    }
    this._aiState = state
    if (state === 'flee') {
      this._fleeSide = this._pickFleeSide()
    } else {
      this._fleeSide = 0
    }
    this._squad?.detachFromGroup(this)
    this._group = null
    this._slotIndex = -1
    this._slotSeeded = false
  }

  /** Rapid consecutive hits that never break the shield trigger retaliation. */
  private _registerHitStreak(shieldBroke: boolean): void {
    const morale = this._sheet.morale
    if (shieldBroke) {
      this._hitStreak = 0
      this._hitStreakMs = 0
      return
    }
    this._hitStreak = this._hitStreakMs > 0 ? this._hitStreak + 1 : 1
    this._hitStreakMs = Math.max(1, morale.retaliationWindowMs)
    if (this._hitStreak >= Math.max(1, morale.retaliationHits)) {
      this._enterRogue('fury')
    }
  }

  private _rollImperfection(): void {
    const r = Math.max(0, this._sheet.formation.imperfectionRadius)
    const angle = this._rand() * Math.PI * 2
    const dist = Math.sqrt(this._rand()) * r
    this._offsetX = Math.cos(angle) * dist
    this._offsetZ = Math.sin(angle) * dist
  }

  private _arenaMinX(): number {
    return this._squad?.arenaMinX() ?? -BALANCE.enemy.squad.arenaHalfX
  }

  private _arenaMaxX(): number {
    return this._squad?.arenaMaxX() ?? BALANCE.enemy.squad.arenaHalfX
  }

  private _tickStatus(dt: number): void {
    const dtMs = dt * 1000
    if (this._hittedMs > 0) {
      this._hittedMs = Math.max(0, this._hittedMs - dtMs)
    }
    if (this._hittedMs === 0) {
      this._regenShield(dt)
    }
    if (this._hittingMs > 0) {
      this._hittingMs = Math.max(0, this._hittingMs - dtMs)
    }
    const r = this._sheet.status.inRangeRadius
    this._inRange = distXZ(this.x, this.z, this._seek.x, this._seek.z) <= r
    // Enemy advances +Z; once past the player's Z it is "passed".
    this._passedOpponent = this.z >= this._seek.z
  }

  private _regenShield(dt: number): void {
    if (this.shieldMax <= 0 || this.shield >= this.shieldMax) {
      return
    }
    this.shield = Math.min(this.shieldMax, this.shield + this._sheet.shieldRegenPerSec * dt)
  }

  private _syncRangeVisual(): void {
    const r = Math.max(0.5, this._sheet.status.inRangeRadius)
    this._rangeMesh.scale.setScalar(r)
    this._rangeMat.color.setHex(this._sheet.status.rangeColor)
    this._rangeMat.opacity = this._sheet.status.rangeOpacity
    this._rangeMesh.visible = this.active && this._sheet.status.rangeVisible
  }

  private _syncGroupLabel(): void {
    const key =
      this._group !== null
        ? String(this._group.id)
        : this._aiState === 'fury'
          ? 'F'
          : this._aiState === 'flee'
            ? 'L'
            : '-'
    if (key !== this._groupLabelKey) {
      this._groupLabelKey = key
      this._groupLabelMat.map = groupLabelTexture(key)
      this._groupLabelMat.needsUpdate = true
    }
    this._groupLabel.visible = this.active
  }

  private _refreshGateAim(): { x: number; y: number; z: number } {
    this._gateAim.x = this._gate.x + this._entryOffsetX
    this._gateAim.y = this._gate.y
    this._gateAim.z = this._gate.z
    return this._gateAim
  }

  private _tryFire(dt: number): void {
    if (this._aiState === 'birth' || !this._shots) {
      return
    }
    const weapon = this._sheet.weapon
    const engage = warriorEngageRange(this._intelligence, weapon.range)
    const toPlayer = distXZ(this.x, this.z, this._seek.x, this._seek.z)
    if (toPlayer > engage) {
      this._fireAcc = 0
      return
    }
    const halfCone = (Math.max(1, weapon.fireConeDeg) * DEG2RAD) / 2
    if (
      !isInsideFireCone(
        this.x,
        this.z,
        this._movement.facingY(),
        this._seek.x,
        this._seek.z,
        halfCone,
      )
    ) {
      this._fireAcc = 0
      return
    }
    this._fireAcc += dt
    const interval = 1 / Math.max(0.05, weapon.rate)
    while (this._fireAcc >= interval) {
      this._fireAcc -= interval
      this._fireBolt(weapon)
    }
  }

  private _fireBolt(weapon: EditableWarriorSheet['weapon']): void {
    if (!this._shots) {
      return
    }
    const shot = this._shots.acquire()
    if (!shot) {
      return
    }
    const facing = this._movement.facingY()
    const speed = Math.abs(weapon.speed)
    const muzzle = weapon.muzzleZ
    const dirX = Math.sin(facing)
    const dirZ = Math.cos(facing)
    const spawn: ShotSpawn = {
      x: this.x + dirX * muzzle,
      z: this.z + dirZ * muzzle,
      vx: dirX * speed,
      vz: dirZ * speed,
      damage: weapon.damage,
      lifetime: weapon.lifetime,
      totalLifetime: weapon.lifetime,
      radius: weapon.radius,
      aoeRadius: 0,
      range: weapon.range,
      decayPerUnit: weapon.decayPerUnit,
      color: weapon.color,
    }
    shot.activate(spawn)
    this.notifyHitting()
  }
}
