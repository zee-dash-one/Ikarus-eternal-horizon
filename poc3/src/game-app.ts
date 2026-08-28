import { SIM_DT, GameLoop } from './core/game-loop.ts'
import { BALANCE } from './core/balancer.ts'
import { AuthManager } from './systems/auth-manager.ts'
import { AssetManager } from './systems/asset-manager.ts'
import { SoundManager } from './systems/sound-manager.ts'
import { InputManager } from './systems/input-manager.ts'
import { CharSheetManager } from './systems/char-sheet-manager.ts'
import { EnergyManager } from './systems/energy-manager.ts'
import { PlayerManager } from './systems/player-manager.ts'
import { CameraManager } from './systems/camera-manager.ts'
import { FiringManager } from './systems/firing-manager.ts'
import { ShotManager } from './systems/shot-manager.ts'
import { SceneManager } from './scenes/scene-manager.ts'
import { StartScene } from './scenes/start-scene.ts'
import { TitleScene } from './scenes/title-scene.ts'
import { RunScene } from './scenes/run-scene.ts'
import { GameRenderer } from './render/renderer.ts'
import { HudManager } from './render/hud-manager.ts'
import type { GameUiHost } from './ui/game-ui-types.ts'
import { createDemoKit } from './platform/kit-demo.ts'
import type { PlatformKit } from './platform/kit-demo.ts'
import { loadControlSettings, saveControlSettings } from './persist/control-settings.ts'

export interface GameAppOptions {
  readonly canvas: HTMLCanvasElement
  readonly debuggerRoot: HTMLElement
  readonly ui: GameUiHost
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
  readonly firing: FiringManager
  readonly shots: ShotManager
  readonly camera = new CameraManager()
  readonly scenes = new SceneManager()
  readonly renderer: GameRenderer
  readonly hud: HudManager
  readonly loop: GameLoop
  private readonly _ui: GameUiHost
  private _run: RunScene | null = null
  private _startScene: StartScene | null = null
  private _pauseOpen = false
  private readonly _isDev: boolean
  private readonly _canvas: HTMLCanvasElement

  constructor(options: GameAppOptions) {
    const kit = options.kit ?? createDemoKit()
    this._canvas = options.canvas
    this._ui = options.ui
    this.auth.setPlatformAdapter(kit.auth)
    this.input = new InputManager(options.canvas.parentElement ?? undefined)
    this.energy = new EnergyManager(this.sheet)
    this.shots = new ShotManager()
    this.firing = new FiringManager(this.input, this.energy, this.sheet, this.shots)
    this.player = new PlayerManager(this.input, this.sheet, this.energy)
    this.energy.bindRegenGate(() => this.sheet.shipStatus.energizing)
    this.renderer = new GameRenderer({ canvas: options.canvas })
    const gameArea = document.getElementById('game-area')
    this.hud = new HudManager(gameArea ?? options.canvas.parentElement ?? document.body)
    this._isDev = !import.meta.env.PROD
    this._ui.setIsDev(this._isDev)

    this.loop = new GameLoop({
      step: (dt) => {
        this.scenes.update(dt)
      },
      sidecar: () => {
        if (this._pauseOpen) {
          this._pollPauseInput()
          this._refreshDevLive()
        }
        this.scenes.syncRender()
      },
    })

    this._wireUi()
    this._wireDebugger(options.debuggerRoot)
    window.addEventListener('resize', () => {
      this.renderer.resize(window.innerWidth, window.innerHeight)
    })
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        this._togglePause()
        return
      }
      if (e.key === 'Enter' && this.scenes.current?.id === 'start' && this._startScene) {
        this._startScene.tryStart()
      }
    })
    this._canvas.addEventListener('click', () => {
      if (this.scenes.current?.id === 'start' && this._startScene) {
        this._startScene.tryStart()
      }
    })
  }

  async boot(): Promise<void> {
    const controlSettings = await loadControlSettings()
    this.input.setScheme(controlSettings.scheme)
    this._ui.setScheme(controlSettings.scheme)

    const session = await this.auth.resolveBootSession()
    if (session) {
      this._ui.setLoginVisible(false)
      this._mountStart()
    } else {
      this._ui.setLoginVisible(true)
    }
  }

  private _wireUi(): void {
    this._ui.setLoginHandlers({
      onSubmit: async (username, password) => {
        this._ui.setLoginBusy(true)
        this._ui.setLoginError(null)
        const session = await this.auth.trySignIn(username, password)
        this._ui.setLoginBusy(false)
        if (!session) {
          this._ui.setLoginError('Invalid credentials')
          return
        }
        this._ui.setLoginVisible(false)
        this._mountStart()
      },
      onGoogle: () => {
        this.auth.signInWithGoogle()
      },
    })

    this._ui.setPauseHandlers({
      onResume: () => this._closePause(),
      onSchemeChange: (scheme) => {
        this.input.setScheme(scheme)
        void saveControlSettings({ scheme })
      },
      onMuteChange: (muted) => this.sound.setMuted(muted),
      onFreeCamChange: (enabled) => this.camera.setFreeCam(enabled),
      onBalanceChange: () => {
        this.sheet.recalcSummaryOnly()
        this._run?.refreshCraftRings()
        this._refreshDevLive()
      },
    })
  }

  private _mountStart(): void {
    const start = new StartScene({
      assets: this.assets,
      sound: this.sound,
      renderer: this.renderer,
      onStart: () => this._mountTitle(),
    })
    this._startScene = start
    this.scenes.mount(start)
    this.loop.start()
    this._ui.setStartHintVisible(true)
    if (this.assets.criticalReady) {
      window.setTimeout(() => start.tryStart(), 400)
    }
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
    this._ui.setStartHintVisible(false)
    this._startScene = null
    this._run = new RunScene({
      renderer: this.renderer,
      loop: this.loop,
      input: this.input,
      player: this.player,
      camera: this.camera,
      energy: this.energy,
      sheet: this.sheet,
      firing: this.firing,
      shots: this.shots,
      hud: this.hud,
      onPause: () => this._openPause(),
    })
    this.scenes.mount(this._run)
    this.hud.setVisible(true)
    this.hud.setPausedDimmed(false)
  }

  private _openPause(): void {
    if (!this._run || this.scenes.current?.id !== 'run' || this._pauseOpen) return
    this._pauseOpen = true
    this.loop.pause()
    this.hud.setPausedDimmed(true)
    this._ui.setPauseTab('controls')
    this._refreshDevLive()
    this._ui.setPauseOpen(true)
    this.input.clearPressed('Start')
  }

  private _closePause(): void {
    if (!this._pauseOpen) return
    this._pauseOpen = false
    this.loop.resume()
    this.hud.setPausedDimmed(false)
    this._ui.setPauseOpen(false)
    this.input.clearPressed('Start')
  }

  private _pollPauseInput(): void {
    const scheme = this.input.scheme
    if (scheme !== 'gamepad' && scheme !== 'touch') {
      return
    }
    this.input.update()
    if (this.input.wasPressed('Start')) {
      this._closePause()
    }
  }

  private _togglePause(): void {
    if (this.scenes.current?.id === 'run') {
      if (this._pauseOpen) {
        this._closePause()
      } else {
        this._openPause()
      }
    }
  }

  private _refreshDevLive(): void {
    if (!this._isDev) {
      return
    }
    const s = this._run
      ? this._run.snapshot.summary
      : (() => {
          const sheet = this.sheet.summary
          return {
            HP: sheet.HP,
            ENE: sheet.ENE,
            SHD: sheet.SHD,
            SPD: sheet.SPD,
            S_R: sheet.S_R,
            integrityMax: sheet.integrity_max,
            eneMax: BALANCE.sheet.playerDefaults.ENE_max,
            shdMax: BALANCE.sheet.playerDefaults.SHD_max,
            integrityState: sheet.integrityState,
          }
        })()
    const pose = this._run?.snapshot.player ?? { x: 0, y: 0, z: 0, rotY: 0, bank: 0, dashing: false }
    const status = this.sheet.shipStatus
    const yesNo = (v: boolean): string => (v ? 'yes' : 'no')
    this._ui.setDevLive({
      integrity: `${s.HP.toFixed(0)} / ${s.integrityMax} (${s.integrityState})`,
      energy: `${s.ENE.toFixed(1)} / ${s.eneMax}`,
      shield: `${s.SHD.toFixed(0)} / ${s.shdMax}`,
      spd: `${s.SPD.toFixed(1)} / ${s.S_R.toFixed(1)}`,
      pose: `x ${pose.x.toFixed(1)} z ${pose.z.toFixed(1)} bank ${pose.bank.toFixed(1)}°`,
      dashing: yesNo(status.dashing),
      shooting: yesNo(status.shooting),
      bombing: yesNo(status.bombing),
      energizing: yesNo(status.energizing),
    })
  }

  private _wireDebugger(host: HTMLElement): void {
    if (!this._isDev) {
      host.hidden = true
    }
    const pre = document.createElement('pre')
    host.appendChild(pre)
    setInterval(() => {
      const s = this.sheet.summary
      const scene = this.scenes.current?.id ?? 'boot'
      pre.textContent = `[${scene}] SPD ${s.SPD.toFixed(1)} ENE ${s.ENE.toFixed(0)} ${s.integrityState}`
    }, 200)
  }
}

export { SIM_DT }
