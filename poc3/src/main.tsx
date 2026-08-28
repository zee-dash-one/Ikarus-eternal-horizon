import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { GameApp } from './game-app.ts'
import { getGameUiController } from './ui/game-ui-store.ts'
import { LoginRoot } from './ui/react/login/LoginRoot.tsx'
import { StartHint } from './ui/react/hints/StartHint.tsx'
import { StoreRoot } from './ui/react/store/StoreRoot.tsx'
import { PauseOverlay } from './ui/react/pause/PauseOverlay.tsx'

function mountUi(): void {
  const loginRoot = document.getElementById('login-root')
  const startHint = document.getElementById('start-hint')
  const storeRoot = document.getElementById('store-root')
  const pauseMount = document.getElementById('pause-overlay-mount')
  if (!loginRoot || !startHint || !storeRoot || !pauseMount) {
    throw new Error('Missing UI mount roots in index.html')
  }

  createRoot(loginRoot).render(
    <StrictMode>
      <LoginRoot />
    </StrictMode>,
  )
  createRoot(startHint).render(
    <StrictMode>
      <StartHint />
    </StrictMode>,
  )
  createRoot(storeRoot).render(
    <StrictMode>
      <StoreRoot />
    </StrictMode>,
  )
  createRoot(pauseMount).render(
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
    gameApp = new GameApp({
      canvas,
      debuggerRoot,
      ui: controller,
    })
    void gameApp.boot()
  }, [controller])

  return null
}

function mountGame(): void {
  const bootstrap = document.getElementById('game-bootstrap')
  if (!bootstrap) {
    throw new Error('Missing #game-bootstrap')
  }
  createRoot(bootstrap).render(
    <StrictMode>
      <GameBootstrap />
    </StrictMode>,
  )
}

mountUi()
mountGame()
