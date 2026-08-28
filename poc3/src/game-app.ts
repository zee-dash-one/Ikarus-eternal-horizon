import { SIM_DT, GameLoop } from './core/game-loop.ts'
import { AuthManager } from './systems/auth-manager.ts'
import { AssetManager } from './systems/asset-manager.ts'
import { SoundManager } from './systems/sound-manager.ts'
import { InputManager } from './systems/input-manager.ts'
import { CharSheetManager } from './systems/char-sheet-manager.ts'
import { EnergyManager } from './systems/energy-manager.ts'
import { PlayerManager } from './systems/player-manager.ts'
import { CameraManager } from './systems/camera-manager.ts'
import { SceneManager } from './scenes/scene-manager.ts'
import { StartScene } from './scenes/start-scene.ts'
import { TitleScene } from './scenes/title-scene.ts'
import { RunScene } from './scenes/run-scene.ts'
import { PauseOverlay } from './scenes/pause-overlay.ts'
import { GameRenderer } from './render/renderer.ts'
import { createLoginUiBridge } from './ui/login-ui-bridge.ts'
import { createDemoKit } from './platform/kit-demo.ts'
import type { PlatformKit } from './platform/kit-demo.ts'

export interface GameAppOptions {
  readonly canvas: HTMLCanvasElement
  readonly loginRoot: HTMLElement
  readonly debuggerRoot: HTMLElement
  readonly kit?: PlatformKit
}

export class GameApp {
  readonly auth = new AuthManager()
  readonly assets = new AssetManager()
  readonly sound = new SoundManager()
  readonly input: InputManager
  readonly sheet = CharSheetManager.create()
  readonly energy: EnergyManager
  readonly player: PlayerManager
  readonly camera = new CameraManager()
  readonly scenes = new SceneManager()
  readonly renderer: GameRenderer
  readonly loop: GameLoop
  private readonly _loginUi
  private _run: RunScene | null = null
  private _pause: PauseOverlay | null = null
  private readonly _isDev: boolean

  constructor(options: GameAppOptions) {
    const kit = options.kit ?? createDemoKit()
    this.auth.setPlatformAdapter(kit.auth)
    this.input = new InputManager(options.canvas.parentElement ?? undefined)
    this.energy = new EnergyManager(this.sheet)
    this.player = new PlayerManager(this.input, this.sheet, this.energy)
    this.renderer = new GameRenderer({ canvas: options.canvas })
    this._loginUi = createLoginUiBridge(options.loginRoot)
    this._isDev = !import.meta.env.PROD

    this.loop = new GameLoop({
      step: (dt) => {
        this.scenes.update(dt)
      },
      sidecar: () => {
        this.scenes.syncRender()
      },
    })

    this._wireLogin()
    this._wireDebugger(options.debuggerRoot)
    window.addEventListener('resize', () => {
      this.renderer.resize(window.innerWidth, window.innerHeight)
    })
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._togglePause()
      }
    })
  }

  async boot(): Promise<void> {
    const session = await this.auth.probeSession()
    if (session) {
      this._loginUi.hide()
      this._mountStart()
    } else {
      this._loginUi.show()
    }
  }

  private _wireLogin(): void {
    this._loginUi.onSubmit(async (username, password) => {
      this._loginUi.setBusy(true)
      this._loginUi.setError(null)
      const session = await this.auth.trySignIn(username, password)
      this._loginUi.setBusy(false)
      if (!session) {
        this._loginUi.setError('Invalid credentials')
        return
      }
      this._loginUi.hide()
      this._mountStart()
    })
    this._loginUi.onGoogle(() => {
      this.auth.signInWithGoogle()
    })
  }

  private _mountStart(): void {
    const start = new StartScene({
      assets: this.assets,
      sound: this.sound,
      renderer: this.renderer,
      onStart: () => this._mountTitle(),
    })
    this.scenes.mount(start)
    this.loop.start()
    optionsStartClick(start)
  }

  private _mountTitle(): void {
    const title = new TitleScene({
      renderer: this.renderer,
      onRun: () => this._mountRun(),
    })
    this.scenes.mount(title)
    title.goToRun()
  }

  private _mountRun(): void {
    this._run = new RunScene({
      renderer: this.renderer,
      loop: this.loop,
      input: this.input,
      player: this.player,
      camera: this.camera,
      energy: this.energy,
      sheet: this.sheet,
      onPause: () => this._openPause(),
    })
    this.scenes.mount(this._run)
  }

  private _openPause(): void {
    if (!this._run) return
    document.getElementById('pause-overlay')?.removeAttribute('hidden')
    this._pause = new PauseOverlay({
      renderer: this.renderer,
      loop: this.loop,
      input: this.input,
      sound: this.sound,
      camera: this.camera,
      run: this._run,
      onResume: () => this._closePause(),
      isDev: this._isDev,
    })
    this.scenes.mount(this._pause)
  }

  private _closePause(): void {
    document.getElementById('pause-overlay')?.setAttribute('hidden', '')
    if (this._run) {
      this.scenes.mount(this._run)
    }
    this._pause = null
  }

  private _togglePause(): void {
    if (this.scenes.current?.id === 'run') {
      this._openPause()
    } else if (this.scenes.current?.id === 'pause') {
      this._closePause()
    }
  }

  private _wireDebugger(host: HTMLElement): void {
    if (!this._isDev) {
      host.hidden = true
      document.getElementById('pause-dev-tab')?.setAttribute('hidden', '')
    }
    const pre = document.createElement('pre')
    host.appendChild(pre)
    setInterval(() => {
      const s = this.sheet.summary
      pre.textContent = `SPD ${s.SPD.toFixed(1)} ENE ${s.ENE.toFixed(0)} ${s.integrityState}`
    }, 200)
    this._wirePauseDom()
  }

  private _wirePauseDom(): void {
    const resume = document.getElementById('pause-resume')
    const scheme = document.getElementById('pause-scheme') as HTMLSelectElement | null
    const freeCam = document.getElementById('pause-free-cam') as HTMLInputElement | null
    const mute = document.getElementById('pause-mute') as HTMLInputElement | null
    const tabs = document.getElementById('pause-tabs')

    resume?.addEventListener('click', () => this._closePause())
    scheme?.addEventListener('change', () => {
      this.input.setScheme(scheme.value as 'keyboard' | 'mix' | 'gamepad' | 'touch')
    })
    freeCam?.addEventListener('change', () => {
      this.camera.setFreeCam(freeCam.checked)
    })
    mute?.addEventListener('change', () => {
      this.sound.setMuted(mute.checked)
    })
    tabs?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-tab]')
      if (!btn) return
      const tab = btn.dataset.tab
      for (const id of ['controls', 'audio', 'graphics', 'dev']) {
        const el = document.getElementById(`pause-tab-${id}`)
        if (el) el.hidden = id !== tab
      }
    })
  }
}

function optionsStartClick(start: StartScene): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      start.tryStart()
    }
  })
}

export { SIM_DT }
