import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import './style.css'
import { GameApp } from './game-app.ts'
import { getGameUiController } from './ui/game-ui-store.ts'
import { LoginRoot } from './ui/react/login/LoginRoot.tsx'
import { AccountPanel } from './ui/react/login/AccountPanel.tsx'
import { StartHint } from './ui/react/hints/StartHint.tsx'
import { StoreRoot } from './ui/react/store/StoreRoot.tsx'
import { PauseOverlay } from './ui/react/pause/PauseOverlay.tsx'
import { RunMetaPanels } from './ui/react/meta/RunMetaPanels.tsx'

const mountedRoots: Root[] = []
function mountRoot(element: HTMLElement): Root {
  const root = createRoot(element)
  mountedRoots.push(root)
  return root
}

function mountUi(): void {
  const loginRoot = document.getElementById('login-root')
  const accountRoot = document.getElementById('account-root')
  const metaRoot = document.getElementById('run-meta-root')
  const startHint = document.getElementById('start-hint')
  const storeRoot = document.getElementById('store-root')
  const pauseMount = document.getElementById('pause-overlay-mount')
  if (!loginRoot || !accountRoot || !metaRoot || !startHint || !storeRoot || !pauseMount) {
    throw new Error('Missing UI mount roots in index.html')
  }

  mountRoot(loginRoot).render(
    <StrictMode>
      <LoginRoot />
    </StrictMode>,
  )
  mountRoot(accountRoot).render(<StrictMode><AccountPanel /></StrictMode>)
  mountRoot(metaRoot).render(<StrictMode><RunMetaPanels /></StrictMode>)
  mountRoot(startHint).render(
    <StrictMode>
      <StartHint />
    </StrictMode>,
  )
  mountRoot(storeRoot).render(
    <StrictMode>
      <StoreRoot />
    </StrictMode>,
  )
  mountRoot(pauseMount).render(
    <StrictMode>
      <PauseOverlay />
    </StrictMode>,
  )
}

let gameApp: GameApp | null = null

function GameBootstrap() {
  const controller = getGameUiController()

  useEffect(() => {
    if (gameApp) {
      return
    }
    const canvas = document.getElementById('game-canvas')
    const debuggerRoot = document.getElementById('debugger-area')
    if (!(canvas instanceof HTMLCanvasElement) || !debuggerRoot) {
      throw new Error('Missing #game-canvas or #debugger-area')
    }
    let cancelled = false
    void (async () => {
    const production = import.meta.env.PROD ? await import('./platform/kit-production.ts') : null
    if (cancelled || gameApp) return
    const kit = production?.createProductionKit()
    gameApp = new GameApp({
      canvas,
      debuggerRoot,
      ui: controller, kit,
    })
    await gameApp.boot()
    })().catch((error: unknown) => {
      controller.setLoginVisible(true)
      controller.setLoginError(error instanceof Error ? error.message : 'Não foi possível iniciar o jogo.')
    })
    return () => { cancelled = true }
  }, [controller])

  return null
}

function mountGame(): void {
  const bootstrap = document.getElementById('game-bootstrap')
  if (!bootstrap) {
    throw new Error('Missing #game-bootstrap')
  }
  mountRoot(bootstrap).render(
    <StrictMode>
      <GameBootstrap />
    </StrictMode>,
  )
}

mountUi()
mountGame()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    gameApp?.dispose()
    gameApp = null
    for (const root of mountedRoots) root.unmount()
  })
}
