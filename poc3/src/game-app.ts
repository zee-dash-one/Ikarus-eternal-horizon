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
import { cloneInputBindings } from './core/input-bindings.ts'
import { TouchControls } from './ui/touch-controls/touch-controls.ts'
import { loadControlSettings, saveControlSettings } from './persist/control-settings.ts'
import {
  releasePointerLock,
  requestPointerLock,
  shouldCapturePointerForMix,
} from './ui/pointer-lock.ts'
import { pauseMenuNav } from './ui/pause-menu-nav.ts'
import { isRemapListening } from './ui/remap-listen-state.ts'

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
  private readonly _pointerLockHost: HTMLElement
  private _touchOverlay: TouchControls | null = null

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
    this._pointerLockHost = gameArea ?? options.canvas.parentElement ?? options.canvas
    this.hud = new HudManager(gameArea ?? options.canvas.parentElement ?? document.body)
    this._touchOverlay = new TouchControls({
      host: gameArea ?? options.canvas.parentElement ?? document.body,
      adapter: this.input.touchAdapter,
      getSlots: () => this.input.bindings.bindings.touch,
      enabled: false,
    })
    this._isDev = !import.meta.env.PROD
    this._ui.setIsDev(this._isDev)

    this.loop = new GameLoop({
      step: (dt) => {
        this.scenes.update(dt)
      },
      sidecar: () => {
        if (this._pauseOpen && !isRemapListening()) {
          pauseMenuNav.pollGamepad()
          this._refreshDevLive()
        } else if (this._pauseOpen) {
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
      if (e.key === 'Enter' && this.scenes.current?.id === 'start' && this._startScene) {
        this._startScene.tryStart()
      }
    })
    this._canvas.addEventListener('click', () => {
      if (this.scenes.current?.id === 'start' && this._startScene) {
        this._startScene.tryStart()
      }
    })
    this._pointerLockHost.addEventListener('mousedown', () => {
      this._tryCapturePointer()
    })
  }

  async boot(): Promise<void> {
    const controlSettings = await loadControlSettings()
    this.input.bindings.load(controlSettings.bindings)
    this._syncControlUi()
    this.input.setScheme(controlSettings.scheme)
    this._ui.setScheme(controlSettings.scheme)
    this._syncTouchOverlay()

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
        this._syncTouchOverlay()
        this._syncPointerLock()
        void this._persistControls(scheme)
      },
      onBindingsChange: () => this._syncControlUi(),
      assignKeyboard: (action, code) => {
        this.input.bindings.assignKeyboard(action, code)
        this._syncControlUi()
        void this._persistControls()
      },
      assignKeyboardPause: (code) => {
        this.input.bindings.assignKeyboardPause(code)
        this._syncControlUi()
        void this._persistControls()
      },
      assignMouseInput: (action, input) => {
        this.input.bindings.assignMouseInput(action, input)
        this._syncControlUi()
        void this._persistControls()
      },
      setMouseMoveEnabled: (enabled) => {
        this.input.bindings.setMouseMoveEnabled(enabled)
        if (!enabled) {
          this.input.resetMixSteer()
        }
        this._syncControlUi()
        this._syncPointerLock()
        void this._persistControls()
      },
      setMouseMoveSensitivity: (sensitivity) => {
        this.input.bindings.setMouseMoveSensitivity(sensitivity)
        this._syncControlUi()
        void this._persistControls()
      },
      assignGamepadButton: (action, button) => {
        this.input.bindings.assignGamepadButton(action, button)
        this._syncControlUi()
        void this._persistControls()
      },
      assignGamepadPause: (button) => {
        this.input.bindings.assignGamepadPause(button)
        this._syncControlUi()
        void this._persistControls()
      },
      assignTouchSlot: (slot, action) => {
        this.input.bindings.assignTouchSlot(slot, action)
        this._syncControlUi()
        void this._persistControls()
      },
      resetControlBindings: () => {
        this.input.bindings.resetToDefaults()
        this._syncControlUi()
        void this._persistControls()
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

  private _syncControlUi(): void {
    this._ui.syncControlBindings(this.input.bindings.bindings)
    this._touchOverlay?.syncSlots(this.input.bindings.bindings.touch)
  }

  private _syncTouchOverlay(): void {
    const overlay = this._touchOverlay
    if (!overlay) {
      return
    }
    const inRun = this.scenes.current?.id === 'run'
    const show = this.input.scheme === 'touch' && inRun && !this._pauseOpen
    overlay.syncSlots(this.input.bindings.bindings.touch)
    overlay.setVisible(show)
  }

  private async _persistControls(scheme = this.input.scheme): Promise<void> {
    await saveControlSettings({
      scheme,
      bindings: cloneInputBindings(this.input.bindings.bindings),
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
      onPause: () => {
        if (isRemapListening()) {
          return
        }
        this._togglePause()
      },
    })
    this.scenes.mount(this._run)
    this.hud.setVisible(true)
    this.hud.setPausedDimmed(false)
    this._syncTouchOverlay()
  }

  private _flushCombatInput(): void {
    this.input.clearHeld()
    this.input.resetMixSteer()
    this.firing.releaseFireHold()
  }

  private _openPause(): void {
    if (!this._run || this.scenes.current?.id !== 'run' || this._pauseOpen) return
    this._pauseOpen = true
    this.loop.pause()
    this.hud.setPausedDimmed(true)
    this._ui.setPauseTab('controls')
    this._refreshDevLive()
    this._ui.setPauseOpen(true)
    this.input.setCaptureDom(false)
    this._flushCombatInput()
    this.input.clearPressed('Start')
    this._syncPointerLock()
    this._syncTouchOverlay()
  }

  private _closePause(): void {
    if (!this._pauseOpen) return
    this._pauseOpen = false
    this.loop.resume()
    this.hud.setPausedDimmed(false)
    this._ui.setPauseOpen(false)
    this.input.setCaptureDom(true)
    this._flushCombatInput()
    this.input.clearPressed('Start')
    this._syncTouchOverlay()
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

  private _syncPointerLock(): void {
    if (!this._shouldCapturePointer()) {
      releasePointerLock(this._pointerLockHost)
    }
  }

  private _shouldCapturePointer(): boolean {
    return shouldCapturePointerForMix(
      this.input.scheme,
      this.input.bindings.bindings.mouse.moveEnabled,
      this.scenes.current?.id === 'run',
      this._pauseOpen,
    )
  }

  private _tryCapturePointer(): void {
    if (!this._shouldCapturePointer()) {
      return
    }
    requestPointerLock(this._pointerLockHost)
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
