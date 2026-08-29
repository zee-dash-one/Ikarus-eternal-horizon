import {
  Group,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  type Material,
} from 'three'
import {
  BALANCE,
  rgbaToThree,
  shipHudRingRadiusWorld,
  type HudRingSegmentBalance,
  type RgbaColor,
} from '../core/balancer.ts'
import { DEG2RAD } from '../core/math.ts'
import type { SummarySnapshot } from '../core/world-snapshot.ts'
import { resolveHudRingRotationDeg } from './hud-ring-layout.ts'

type FillAnchor = 'start' | 'end'

/** Local Y separation between track → fill → outline (prevents coplanar z-fight). */
const RING_LAYER_Y_STEP = 0.004
/** renderOrder gap between ENE / INT / SHD segments. */
const RING_SEGMENT_ORDER_STRIDE = 10
/** Per-segment layer order: 0 = track (back), 1 = fill, 2 = outline (front). */
const RING_LAYER_ORDER = { track: 0, fill: 1, outline: 2 } as const

interface SegmentDef {
  readonly sliceIndex: number
  readonly fillAnchor: FillAnchor
  readonly style: HudRingSegmentBalance
  readonly value: (s: SummarySnapshot) => number
  readonly max: (s: SummarySnapshot) => number
}

interface SegmentMeshes {
  readonly outline: Mesh
  readonly track: Mesh
  readonly fill: Mesh
  lastRatio: number
}

function clamp01(v: number): number {
  if (v <= 0) {
    return 0
  }
  if (v >= 1) {
    return 1
  }
  return v
}

function normalizeDeg(deg: number): number {
  let d = deg % 360
  if (d < 0) {
    d += 360
  }
  return d
}

function sliceCenterDeg(sliceIndex: number): number {
  const rings = BALANCE.hud.rings
  const step = 360 / rings.sliceCount
  return normalizeDeg(rings.bottomSliceDeg + sliceIndex * step)
}

function sliceSpanDeg(): number {
  const rings = BALANCE.hud.rings
  return (360 - rings.sliceCount * rings.gapDeg) / rings.sliceCount
}

function fillArcDeg(
  trackStart: number,
  spanDeg: number,
  ratio: number,
  anchor: FillAnchor,
): { startDeg: number; arcDeg: number } {
  const filled = spanDeg * ratio
  if (anchor === 'start') {
    return { startDeg: trackStart, arcDeg: filled }
  }
  return { startDeg: trackStart + spanDeg - filled, arcDeg: filled }
}

function makeMaterial(color: RgbaColor, groupOpacity: number, layerIndex: number): MeshBasicMaterial {
  const { color: hex, opacity } = rgbaToThree(color)
  const alpha = clamp01(opacity * groupOpacity)
  return new MeshBasicMaterial({
    color: hex,
    transparent: alpha < 1,
    opacity: alpha,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1 - layerIndex,
    polygonOffsetUnits: -1 - layerIndex,
  })
}

function applyMaterialStyle(
  mat: MeshBasicMaterial,
  color: RgbaColor,
  groupOpacity: number,
): void {
  const { color: hex, opacity } = rgbaToThree(color)
  const alpha = clamp01(opacity * groupOpacity)
  mat.color.setHex(hex)
  mat.opacity = alpha
  mat.transparent = alpha < 1
  mat.depthWrite = false
}

function disposeMaterial(mat: Material): void {
  mat.dispose()
}

function disposeMesh(mesh: Mesh): void {
  mesh.geometry.dispose()
  disposeMaterial(mesh.material as Material)
}

function buildArcGeometry(majorR: number, tubeR: number, arcDeg: number): TorusGeometry {
  const rings = BALANCE.hud.rings
  const geo = new TorusGeometry(
    majorR,
    tubeR,
    rings.borderRadiusSegments,
    24,
    Math.max(0.001, arcDeg * DEG2RAD),
  )
  geo.rotateX(Math.PI / 2)
  return geo
}

function createArcMesh(
  majorR: number,
  tubeR: number,
  startDeg: number,
  arcDeg: number,
  material: MeshBasicMaterial,
  renderOrder: number,
  layerIndex: number,
): Mesh {
  const mesh = new Mesh(buildArcGeometry(majorR, tubeR, arcDeg), material)
  mesh.rotation.y = startDeg * DEG2RAD
  mesh.position.y = layerIndex * RING_LAYER_Y_STEP
  mesh.renderOrder = renderOrder
  return mesh
}

function segmentDefs(): SegmentDef[] {
  const rings = BALANCE.hud.rings
  return [
    {
      sliceIndex: rings.energySlice,
      fillAnchor: 'start',
      style: rings.energy,
      value: (s) => s.ENE,
      max: (s) => s.eneMax,
    },
    {
      sliceIndex: rings.integritySlice,
      fillAnchor: 'end',
      style: rings.integrity,
      value: (s) => s.HP,
      max: (s) => s.integrityMax,
    },
    {
      sliceIndex: rings.shieldSlice,
      fillAnchor: 'start',
      style: rings.shield,
      value: (s) => s.SHD,
      max: (s) => s.shdMax,
    },
  ]
}

/** World-space HUD ring — scene child; follows ship position only (HUD-01). */
export class CraftRingsMesh {
  readonly root: Group
  private readonly _segments: SegmentMeshes[] = []
  private _layoutKey = ''

  constructor() {
    this.root = new Group()
    this.root.name = 'craftRings'
    this._applyOrientation()
    this._rebuildTracks()
  }

  /** World position — no ship rotation inheritance. */
  syncWorldPosition(x: number, y: number, z: number): void {
    const off = BALANCE.hud.rings.position
    this.root.position.set(x + off.x, y + off.y, z + off.z)
  }

  applyOrientation(): void {
    this._applyOrientation()
  }

  sync(summary: SummarySnapshot): void {
    const rings = BALANCE.hud.rings
    if (!rings.enabled) {
      this.root.visible = false
      return
    }

    const dead = summary.integrityState === 'DEAD'
    this.root.visible = rings.visible && (!dead || !rings.hideWhenDead)
    if (!this.root.visible) {
      return
    }

    this._ensureLayout()
    this._applySegmentStyles(rings.opacity)
    const span = sliceSpanDeg()
    const majorR = shipHudRingRadiusWorld()
    const barR = rings.barWidthWorld * 0.5

    const defs = segmentDefs()
    for (let i = 0; i < this._segments.length; i++) {
      const def = defs[i]
      const slot = this._segments[i]
      if (!def || !slot) {
        continue
      }

      const trackStart = sliceCenterDeg(def.sliceIndex) - span / 2
      const ratio = clamp01(def.max(summary) > 0 ? def.value(summary) / def.max(summary) : 0)
      if (Math.abs(slot.lastRatio - ratio) < 0.001) {
        continue
      }
      slot.lastRatio = ratio

      const { startDeg, arcDeg } = fillArcDeg(trackStart, span, ratio, def.fillAnchor)
      slot.fill.geometry.dispose()
      if (ratio <= 0) {
        slot.fill.visible = false
        slot.fill.geometry = buildArcGeometry(majorR, barR, 0.001)
        continue
      }

      slot.fill.visible = true
      slot.fill.geometry = buildArcGeometry(majorR, barR, arcDeg)
      slot.fill.rotation.y = startDeg * DEG2RAD
    }
  }

  dispose(): void {
    for (const slot of this._segments) {
      disposeMesh(slot.outline)
      disposeMesh(slot.track)
      disposeMesh(slot.fill)
    }
    this._segments.length = 0
    this.root.clear()
  }

  invalidateLayout(): void {
    this._layoutKey = ''
  }

  private _ensureLayout(): void {
    const key = this._layoutSignature()
    if (key === this._layoutKey) {
      return
    }
    this._layoutKey = key
    for (const slot of this._segments) {
      disposeMesh(slot.outline)
      disposeMesh(slot.track)
      disposeMesh(slot.fill)
    }
    this._segments.length = 0
    this.root.clear()
    this._applyOrientation()
    this._rebuildTracks()
  }

  private _applySegmentStyles(groupOpacity: number): void {
    const defs = segmentDefs()
    for (let segIdx = 0; segIdx < defs.length; segIdx++) {
      const def = defs[segIdx]
      const slot = this._segments[segIdx]
      if (!def || !slot) {
        continue
      }

      applyMaterialStyle(
        slot.track.material as MeshBasicMaterial,
        def.style.track,
        groupOpacity,
      )
      applyMaterialStyle(
        slot.fill.material as MeshBasicMaterial,
        def.style.fill,
        groupOpacity,
      )
      applyMaterialStyle(
        slot.outline.material as MeshBasicMaterial,
        def.style.outline,
        groupOpacity,
      )
    }
  }

  private _layoutSignature(): string {
    const rings = BALANCE.hud.rings
    const rot = resolveHudRingRotationDeg()
    return [
      rings.gapDeg,
      rings.sliceCount,
      rings.barWidthWorld,
      rings.outlineWidthWorld,
      rings.borderRadiusSegments,
      rings.worldRadiusMul,
      rings.worldRadiusPad,
      rings.autoRotationFromCamera,
      rings.position.x,
      rings.position.y,
      rings.position.z,
      rings.rotation.x,
      rings.rotation.y,
      rings.rotation.z,
      rot.x,
      rot.y,
      rot.z,
      shipHudRingRadiusWorld(),
    ].join('|')
  }

  private _applyOrientation(): void {
    const rot = resolveHudRingRotationDeg()
    this.root.rotation.set(rot.x * DEG2RAD, rot.y * DEG2RAD, rot.z * DEG2RAD)
  }

  private _rebuildTracks(): void {
    const rings = BALANCE.hud.rings
    const majorR = shipHudRingRadiusWorld()
    const barR = rings.barWidthWorld * 0.5
    const outlineR = barR + rings.outlineWidthWorld
    const span = sliceSpanDeg()

    const defs = segmentDefs()
    for (let segIdx = 0; segIdx < defs.length; segIdx++) {
      const def = defs[segIdx]
      const start = sliceCenterDeg(def.sliceIndex) - span / 2
      const baseOrder = rings.renderOrder + segIdx * RING_SEGMENT_ORDER_STRIDE

      const track = createArcMesh(
        majorR,
        barR,
        start,
        span,
        makeMaterial(def.style.track, rings.opacity, RING_LAYER_ORDER.track),
        baseOrder + RING_LAYER_ORDER.track,
        RING_LAYER_ORDER.track,
      )
      const fill = createArcMesh(
        majorR,
        barR,
        start,
        0.001,
        makeMaterial(def.style.fill, rings.opacity, RING_LAYER_ORDER.fill),
        baseOrder + RING_LAYER_ORDER.fill,
        RING_LAYER_ORDER.fill,
      )
      fill.visible = false
      const outline = createArcMesh(
        majorR,
        outlineR,
        start,
        span,
        makeMaterial(def.style.outline, rings.opacity, RING_LAYER_ORDER.outline),
        baseOrder + RING_LAYER_ORDER.outline,
        RING_LAYER_ORDER.outline,
      )

      this.root.add(track)
      this.root.add(fill)
      this.root.add(outline)
      this._segments.push({ outline, track, fill, lastRatio: -1 })
    }
  }
}
