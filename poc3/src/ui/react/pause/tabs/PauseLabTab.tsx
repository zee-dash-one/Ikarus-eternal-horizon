import { BALANCE } from '../../../../core/balancer.ts'
import { MATERIALS, MATERIAL_LABELS } from '../../../../core/run-economy.ts'
import { useGameUiSnapshot } from '../../GameUiContext.tsx'

export function PauseLabTab() {
  const ui = useGameUiSnapshot(), lab = ui.runLab
  if (!lab || lab.survivor) return null
  return <section className="pause-tab" aria-label="Laboratório da partida">
    <h3>Materiais desta partida</h3>
    <dl className="run-meta__stats">{MATERIALS.map((id) => <div key={id}><dt>{MATERIAL_LABELS[id]}</dt><dd>{lab.stock[id]} / {BALANCE.economy.inventory[id]}</dd></div>)}</dl>
    <p>Projetos avançam apenas enquanto a pausa estiver aberta. Materiais e energia são pagos no início; cancelar não devolve o custo.</p>
    <h3>Armamento</h3>
    <div className="run-meta__tabs">{lab.weapons.map((weapon) => <button type="button" key={weapon} aria-pressed={lab.weapon === weapon} disabled={!!lab.job} onClick={() => ui.pauseHandlers.onSelectWeapon?.(weapon)}>{weapon.toUpperCase()}</button>)}</div>
    <p>Arma ativa nível {lab.level} · Nova: {lab.bombs} cargas</p>
    <p>Equipamentos: {lab.equipment.length ? lab.equipment.map((id) => BALANCE.economy.equipment.find((item) => item.id === id)?.label ?? id).join(', ') : 'nenhum'}</p>
    {lab.job && <div role="status"><p>Construindo: {BALANCE.economy.recipes.find((r) => r.id === lab.job?.id)?.label} · {lab.job.remaining.toFixed(1)} s</p><button type="button" onClick={() => ui.pauseHandlers.onCancelCraft?.()}>Cancelar projeto</button></div>}
    {lab.error && <p role="alert">{lab.error}</p>}
    <h3>Projetos</h3>
    <div className="lab-recipes">{BALANCE.economy.recipes.map((recipe) => <article key={recipe.id}>
      <h4>{recipe.label}</h4>
      <p>{MATERIALS.filter((id) => recipe.materials[id]).map((id) => `${recipe.materials[id]} ${MATERIAL_LABELS[id]}`).join(' · ')} · {recipe.energy} ENE · {recipe.duration} s</p>
      <button type="button" disabled={!!lab.job || recipe.minSprint > lab.sprint} onClick={() => ui.pauseHandlers.onCraft?.(recipe.id)}>{recipe.minSprint > lab.sprint ? `Disponível na sprint ${recipe.minSprint}` : 'Construir'}</button>
    </article>)}</div>
  </section>
}
