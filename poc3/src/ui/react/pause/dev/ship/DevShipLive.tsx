import { useGameUiSnapshot } from '../../../GameUiContext.tsx'

export function DevShipLive() {
  const ui = useGameUiSnapshot()
  const live = ui.devLive

  return (
    <dl className="pause-dev__live">
      <dt>Integrity</dt>
      <dd>{live.integrity}</dd>
      <dt>Energy</dt>
      <dd>{live.energy}</dd>
      <dt>Shield</dt>
      <dd>{live.shield}</dd>
      <dt>SPD / S_R</dt>
      <dd>{live.spd}</dd>
      <dt>Pose</dt>
      <dd>{live.pose}</dd>
      <dt>Dashing</dt>
      <dd>{live.dashing}</dd>
      <dt>Shooting</dt>
      <dd>{live.shooting}</dd>
      <dt>Bombing</dt>
      <dd>{live.bombing}</dd>
      <dt>Energizing</dt>
      <dd>{live.energizing}</dd>
    </dl>
  )
}
