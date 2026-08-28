import {
  BalanceNumber,
} from '../../../shared/BalanceFields.tsx'

export function DevShipBalance() {
  return (
    <form className="pause-dev__form" onSubmit={(e) => e.preventDefault()}>
      <h4 className="pause-dev__subhead">BALANCE.player</h4>
      <BalanceNumber path="player.motion.accel" label="motion.accel" />
      <BalanceNumber path="player.motion.maxSpeed" label="motion.maxSpeed" />
      <BalanceNumber path="player.motion.decel" label="motion.decel" />
      <BalanceNumber path="player.motion.brake" label="motion.brake" />
      <BalanceNumber path="player.dash.energyCost" label="dash.energyCost" />
      <BalanceNumber path="player.dash.speedMul" label="dash.speedMul" />
      <BalanceNumber path="player.dash.durationMs" label="dash.durationMs" step={1} round="int" />
      <h4 className="pause-dev__subhead">BALANCE.player.cooldowns</h4>
      <BalanceNumber path="player.cooldowns.dashingMs" label="cooldowns.dashingMs" step={1} round="int" />
      <BalanceNumber path="player.cooldowns.shootingMs" label="cooldowns.shootingMs" step={1} round="int" />
      <BalanceNumber path="player.cooldowns.bombingMs" label="cooldowns.bombingMs" step={1} round="int" />
      <BalanceNumber path="sheet.playerDefaults.SPD" label="sheet.SPD base" />
      <BalanceNumber path="sheet.playerDefaults.ENE_max" label="sheet.ENE_max" />
      <BalanceNumber path="sheet.playerDefaults.REG" label="sheet.REG" />
    </form>
  )
}
