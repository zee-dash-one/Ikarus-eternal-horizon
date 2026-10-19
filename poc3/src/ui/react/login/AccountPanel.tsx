import { useGameUiSnapshot } from '../GameUiContext.tsx'

export function AccountPanel() {
  const ui = useGameUiSnapshot()
  if (!ui.accountName || ui.loginVisible) return null
  return <aside className="account-panel" aria-label="Conta">
    <span>{ui.accountName}</span>
    <button type="button" disabled={ui.accountBusy} onClick={() => ui.accountHandlers.onSignOut()}>{ui.accountBusy ? 'Saindo…' : 'Sair da conta'}</button>
    {ui.accountError && <div role="alert">
      <span>{ui.accountError}</span>
      <button type="button" disabled={ui.accountBusy} onClick={() => ui.accountHandlers.onRetrySave()}>Tentar novamente</button>
    </div>}
  </aside>
}
