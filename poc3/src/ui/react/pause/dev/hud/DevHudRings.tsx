import {
  BalanceCheckbox,
  BalanceNumber,
  BalanceSegmentColors,
  BalanceVec3,
} from '../../../shared/BalanceFields.tsx'

export function DevHudRings() {
  return (
    <form className="pause-dev__form" onSubmit={(e) => e.preventDefault()}>
      <h4 className="pause-dev__subhead">BALANCE.hud.rings</h4>
      <BalanceCheckbox path="hud.rings.enabled" label="enabled" />
      <BalanceCheckbox path="hud.rings.visible" label="visible" />
      <BalanceCheckbox path="hud.rings.hideWhenDead" label="hideWhenDead" />
      <BalanceCheckbox path="hud.rings.autoRotationFromCamera" label="autoRotationFromCamera" />
      <BalanceNumber path="hud.rings.gapDeg" label="gapDeg" />
      <BalanceNumber path="hud.rings.bottomSliceDeg" label="bottomSliceDeg" />
      <BalanceNumber path="hud.rings.barWidthWorld" label="barWidthWorld" step={0.01} />
      <BalanceNumber path="hud.rings.outlineWidthWorld" label="outlineWidthWorld" step={0.01} />
      <BalanceNumber path="hud.rings.borderRadiusSegments" label="borderRadiusSegments" step={1} round="int" min={2} />
      <BalanceNumber path="hud.rings.worldRadiusMul" label="worldRadiusMul" step={0.05} />
      <BalanceNumber path="hud.rings.worldRadiusPad" label="worldRadiusPad" step={0.05} />
      <BalanceNumber path="hud.rings.renderOrder" label="renderOrder" step={1} round="int" />
      <BalanceNumber path="hud.rings.opacity" label="opacity" step={0.05} min={0} max={1} />
      <BalanceVec3 path="hud.rings.position" label="position" />
      <BalanceVec3 path="hud.rings.rotation" label="rotation" />
      <BalanceSegmentColors name="energy" basePath="hud.rings.energy" />
      <BalanceSegmentColors name="integrity" basePath="hud.rings.integrity" />
      <BalanceSegmentColors name="shield" basePath="hud.rings.shield" />
    </form>
  )
}
