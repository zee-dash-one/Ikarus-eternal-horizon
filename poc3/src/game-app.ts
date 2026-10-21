import { IndexedResultOutbox } from './persist/result-outbox.ts'
import { SIM_DT, GameLoop } from './core/game-loop.ts'
import { AuthManager } from './systems/auth-manager.ts'
import { AssetManager } from './systems/asset-manager.ts'
import { SoundManager } from './systems/sound-manager.ts'
import { InputManager } from './systems/input-manager.ts'
import type { RunContext } from './systems/run-context.ts'
import { RunInputBuffer, GAMEPLAY_TOKENS } from './core/run-input.ts'
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
import { SessionFlow } from './ui/session-flow.ts'
import { RunMetaFlow } from './ui/run-meta-flow.ts'
import { prepareRunWorld } from './ui/run-preparation.ts'
import { RunViewResources } from './render/run-view-resources.ts'
import { RankingManager } from './systems/ranking-manager.ts'
import type { ControlSettings } from './persist/control-settings.ts'
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
  readonly scenes = new SceneManager()
  readonly renderer: GameRenderer
  readonly hud: HudManager
  readonly loop: GameLoop
  readonly rankings = new RankingManager()
  private readonly _runInput = new RunInputBuffer()
  private readonly _listeners = new AbortController()
  private _debugTimer: ReturnType<typeof setInterval> | null = null
  private _debugNode: HTMLElement | null = null
  private _disposed = false
  private readonly _metaFlow: RunMetaFlow
  private _balanceModified = false
  private readonly _sessionFlow: SessionFlow
  private readonly _ui: GameUiHost
  private _run: RunScene | null = null
  private _startScene: StartScene | null = null
  private _pauseOpen = false
  private readonly _isDev: boolean
  private readonly _canvas: HTMLCanvasElement
  private readonly _pointerLockHost: HTMLElement
  private _touchOverlay: TouchControls | null = null

  constructor(options: GameAppOptions) {
    const kit = options.kit ?? (import.meta.env.DEV ? createDemoKit() : undefined)
    if (!kit) throw new Error('Plataforma de produção não configurada.')
    this._canvas = options.canvas
    this._ui = options.ui
    this.auth.setPlatformAdapter(kit.auth)
    this.input = new InputManager(options.canvas.parentElement ?? undefined)
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
    this._ui.setAuthCapabilities(this.auth.capabilities)

    this.loop = new GameLoop({
      step: (dt) => {
        const context = this._metaFlow.lifecycle.context
        if (['ENTERING', 'ACTIVE', 'TRANSITION'].includes(this._metaFlow.lifecycle.phase) && context) {
          context.simulation.step(this._runInput.consume())
          for (const event of context.simulation.events) {
            if (event.type === 'sound_cue') this.sound.playCue(event.cue)
            else if (event.type === 'enemy_destroyed' || event.type === 'meteor_destroyed') this.sound.playCue(event.type)
            else if (event.type === 'WaveStarted') this.sound.playCue(event.miniboss ? 'miniboss' : 'wave')
          }
        }
        else this.scenes.update(dt)
      },
      beforeFrame: (dt) => this._pollFrame(dt),
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

    this._metaFlow = new RunMetaFlow({
      ui: this._ui,
      rankings: this.rankings,
      onTitle: () => this._mountTitleScene(),
      onPlay: (context) => this._mountRun(context),
      prepareRun: (results, signal) => prepareRunWorld(results, signal, this.renderer, (progress) => {
        if (!signal.aborted) this._ui.setMetaState({ preparation: progress })
      }),
      onDisposeRun: () => this._disposeRun(),
      hasModifiedBalance: () => this._balanceModified,
    })
    this._sessionFlow = new SessionFlow({
      auth: this.auth,
      ui: this._ui,
      createProfileStore: (userId) => {
        if (!kit.createProfileStore) throw new Error('Persistência de perfil não configurada nesta plataforma.')
        return kit.createProfileStore(userId)
      },
      applyControls: (settings) => this._applyControls(settings),
      onReady: async () => {
        if (this._disposed) return
        const userId = this.auth.session?.userId
        this.rankings.reset(userId && kit.createRankingAdapter ? kit.createRankingAdapter(userId) : null)
        if (userId) this._metaFlow.bindOutbox(new IndexedResultOutbox(userId))
        if (await this._metaFlow.restorePending()) return
        this.input.setCaptureDom(true)
        this._mountStart()
      },
      onClear: () => this._clearSession(),
    })
    this.input.setCaptureDom(false)
    this._wireUi()
    this._wireDebugger(options.debuggerRoot)
    const listenerOptions = { signal: this._listeners.signal }
    window.addEventListener('beforeunload', (event) => {
      if (!this._metaFlow.canLeaveResult) { event.preventDefault(); event.returnValue = '' }
    }, listenerOptions)
    window.addEventListener('resize', () => {
      this.renderer.resize(window.innerWidth, window.innerHeight)
    }, listenerOptions)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.scenes.current?.id === 'start' && this._startScene) {
        this._startScene.tryStart()
      }
    }, listenerOptions)
    this._canvas.addEventListener('click', () => {
      if (this.scenes.current?.id === 'start' && this._startScene) {
        this._startScene.tryStart()
      }
    }, listenerOptions)
    this._pointerLockHost.addEventListener('mousedown', () => {
      this._tryCapturePointer()
    }, listenerOptions)
    document.addEventListener('visibilitychange', () => {
      this.loop.resetClock()
      if (document.hidden && this._run && !this._pauseOpen) this._openPause()
    }, listenerOptions)
  }

  async boot(): Promise<void> {
    await this._sessionFlow.boot()
  }

  private _pollFrame(dt: number): void {
    this.sound.flush()
    this._metaFlow.mountReady()
    const context = this._metaFlow.lifecycle.context
    if (!this._run || !context) return
    if (context.simulation.dead) {
      const summary = context.results.observeIntegrity('DEAD', new Date().toISOString())
      if (summary) this._metaFlow.finish(summary)
      return
    }
    this.input.update(dt)
    if (!isRemapListening() && this.input.wasPressed('Start')) this._togglePause()
    if (this._pauseOpen) {
      if (!document.hidden && context.waves?.phase === 'ACTIVE') context.crafting.updatePaused(dt)
      this._refreshLab()
      return
    }
    context.waves?.prepareFrame()
    const frame = {
      moveX: this.input.axis('moveX'), moveZ: this.input.axis('moveZ'),
      held: GAMEPLAY_TOKENS.filter((token) => this.input.isDown(token)),
      pressed: GAMEPLAY_TOKENS.filter((token) => this.input.wasPressed(token)),
    }
    this._runInput.sample(frame)
    this._run.updateCameraControls(frame.moveX, frame.moveZ, dt)
  }

  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this.loop.stop()
    this._disposeRun()
    this._metaFlow.clear()
    this._listeners.abort()
    if (this._debugTimer !== null) clearInterval(this._debugTimer)
    this._debugNode?.remove()
    this.input.dispose()
    this._touchOverlay?.dispose()
    pauseMenuNav.detach()
    this.sound.dispose()
    this.hud.dispose()
    this.renderer.dispose()
  }

  private _applyControls(controlSettings: ControlSettings): void {
    if (this._disposed) return
    this.input.bindings.load(controlSettings.bindings)
    this._syncControlUi()
    this.input.setScheme(controlSettings.scheme)
    this._ui.setScheme(controlSettings.scheme)
    this._syncTouchOverlay()

  }

  private _clearSession(): void {
    if (this._disposed) return
    this._metaFlow.clear()
    this.loop.stop()
    this.loop.resume()
    this._disposeRun()
    this.sound.setMuted(false)
  }

  private _disposeRun(): void {
    this.scenes.dispose()
    this._run = null
    this._startScene = null
    this._pauseOpen = false
    this._ui.setPauseOpen(false)
    this._ui.setRunLab(null)
    this._ui.setStartHintVisible(false)
    this.hud.setVisible(false)
    this.input.setCaptureDom(false)
    this._flushCombatInput()
    this.loop.resetClock()
    releasePointerLock(this._pointerLockHost)
    this._syncTouchOverlay()
  }

  private _wireUi(): void {
    this._ui.setLoginHandlers({
      onSubmit: (email, password) => { void this._sessionFlow.signIn(email, password) },
      onRegister: (email, password) => { void this._sessionFlow.register(email, password) },
      onRetry: () => { void this._sessionFlow.boot() },
      onGoogle: () => { void this.auth.signInWithGoogle().catch((error: unknown) => this._ui.setLoginError(error instanceof Error ? error.message : 'Falha ao entrar com Google.')) },
    })
    this._ui.setAccountHandlers({
      onSignOut: () => {
        if (!this._metaFlow.canLeaveResult) {
          this._ui.setMetaState({ resultError: 'Registre ou descarte o resultado antes de sair da conta.' })
          return
        }
        void this._sessionFlow.signOut()
      },
      onRetrySave: () => { void this._sessionFlow.retryAccountAction() },
    })

    this._ui.setMetaHandlers({
      onReauthenticate: () => {
        if (this._metaFlow.canReauthenticate) void this._sessionFlow.boot()
        else this._ui.setMetaState({ resultError: 'Tente registrar novamente para salvar uma cópia local antes de reentrar.' })
      },
      onMode: (mode) => this._metaFlow.selectMode(mode),
      onPlay: () => { void this._metaFlow.play() },
      onRankings: () => { void this._metaFlow.openRankings() },
      onTitle: () => this._metaFlow.showTitle(),
      onCloseRankings: () => this._metaFlow.closeRankings(),
      onPeriod: (period) => { void this._metaFlow.loadBoard(period) },
      onRetryBoard: () => { void this._metaFlow.openRankings() },
      onRetrySubmit: () => { void this._metaFlow.retrySubmit() },
      onDiscardResult: () => this._metaFlow.discardResult(),
    })

    this._ui.setPauseHandlers({
      onCraft: (id) => { this._metaFlow.lifecycle.context?.crafting.start(id, this._pauseOpen); this._refreshLab() },
      onCancelCraft: () => { this._metaFlow.lifecycle.context?.crafting.cancel(); this._refreshLab() },
      onSelectWeapon: (id) => { this._metaFlow.lifecycle.context?.firing.select(id); this._metaFlow.lifecycle.context?.simulation.refreshSnapshot(); this._refreshLab() },
      onQuit: () => this._metaFlow.showTitle(),
      onDevFinish: () => {
        if (!this._isDev || !this._run) return
        this._metaFlow.markDebugModified()
        const context = this._metaFlow.lifecycle.context
        if (!context) return
        context.sheet.applyIntegrityDamage(context.sheet.summary.integrity_max)
        context.sheet.applyIntegrityDamage(1)
        this._closePause()
      },
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
      onMusicVolume: (value) => this.sound.setMusicVolume(value),
      onSfxVolume: (value) => this.sound.setSfxVolume(value),
      onMuteChange: (muted) => this.sound.setMuted(muted),
      onFreeCamChange: (enabled) => this._run?.setFreeCam(enabled),
      onBalanceChange: () => {
        this._balanceModified = true
        this._metaFlow.markDebugModified()
        this._metaFlow.lifecycle.context?.sheet.recalcSummaryOnly()
        this._metaFlow.lifecycle.context?.simulation.refreshSnapshot()
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
    await this._sessionFlow.saveControls({
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
  }

  private _mountTitle(): void {
    this._metaFlow.showTitle()
  }

  private _mountTitleScene(): void {
    this._ui.setStartHintVisible(false)
    this._startScene = null
    const title = new TitleScene({
      renderer: this.renderer,
      onRun: () => { void this._metaFlow.play() },
    })
    this.scenes.mount(title)
    this.loop.resume()
    this.loop.start()
  }

  private _mountRun(context: RunContext): void {
    const view = context.prepared?.view
    if (!(view instanceof RunViewResources) || !view.ready) throw new Error('Mundo ainda não preparado.')
    this._ui.setStartHintVisible(false)
    this._startScene = null
    this._run = new RunScene({
      renderer: this.renderer,
      view,
      hud: this.hud,
      getSnapshot: () => context.simulation.snapshot,
      getHighScore: () => this.rankings.highScore,
    })
    this.scenes.mount(this._run)
    this.hud.resetRun()
    this.hud.setVisible(true)
    this.hud.setPausedDimmed(false)
    this.loop.resume()
    this.loop.start()
    this.input.setCaptureDom(true)
    this._syncTouchOverlay()
  }

  private _flushCombatInput(): void {
    this.input.clearHeld()
    this.input.resetMixSteer()
    this._runInput.clear()
    this._metaFlow.lifecycle.context?.firing.releaseFireHold()
  }

  private _openPause(): void {
    if (!this._run || this.scenes.current?.id !== 'run' || this._pauseOpen) return
    this._pauseOpen = true
    this._metaFlow.lifecycle.context?.simulation.setPaused(true)
    this.loop.pause()
    this.hud.setPausedDimmed(true)
    this._ui.setPauseTab('controls')
    this._refreshDevLive()
    this._refreshLab()
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
    this._metaFlow.lifecycle.context?.simulation.setPaused(false)
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

  private _refreshLab(): void {
    const ctx = this._metaFlow.lifecycle.context
    if (!ctx) { this._ui.setRunLab(null); return }
    this._ui.setRunLab({
      survivor: ctx.results.metadata.mode === 'survivor', stock: { ...ctx.inventory.stock },
      sprint: ctx.waves?.plan.sprintIndex ?? 1, weapon: ctx.firing.activeWeapon, weapons: [...ctx.firing.loadout],
      level: ctx.firing.level, bombs: ctx.firing.bombCharges, equipment: [...ctx.equipment],
      job: ctx.crafting.job ? { id: ctx.crafting.job.recipe.id, remaining: Math.ceil(ctx.crafting.job.remaining * 10) / 10 } : null,
      error: ctx.crafting.error,
    })
  }
  private _refreshDevLive(): void {
    const context = this._metaFlow.lifecycle.context
    if (!this._isDev || !context) return
    const { summary: s, player: pose } = context.simulation.snapshot
    const status = context.sheet.shipStatus
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
      preparation: context.prepared
        ? `Sprint ${context.prepared.plan.sprintIndex} · wave ${context.waves?.waveIndex ?? 0}/49 · ${context.waves?.phase} · ${context.prepared.plan.sectorId} · ativos ${context.prepared.enemies.activeCount}/${context.prepared.meteors.activeCount} · próxima ${context.waves?.nextReady ? 'pronta' : 'preparando'} · planos ${context.waves?.retainedPlans} · asteroides omitidos ${context.prepared.meteors.omitted} · pool inimigo ${context.waves?.waitingForEnemyPool ? 'aguardando' : 'livre'}`
        : 'Sem mundo preparado',
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
    this._debugNode = pre
    host.appendChild(pre)
    this._debugTimer = setInterval(() => {
      const context = this._metaFlow.lifecycle.context
      const s = context?.sheet.summary
      const scene = this.scenes.current?.id ?? 'boot'
      pre.textContent = s && context
        ? `[${scene}/${this._metaFlow.lifecycle.phase}] tick ${context.simulation.snapshot.tick} · ${context.results.elapsedSec.toFixed(1)}s · SPD ${s.SPD.toFixed(1)} ENE ${s.ENE.toFixed(0)} ${s.integrityState}`
        : `[${scene}] sem partida ativa`
    }, 200)
  }
}

export { SIM_DT }
