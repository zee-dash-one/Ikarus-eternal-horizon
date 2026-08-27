/**
 * #tag/arch #tag/audio
 *
 * Card:         §7 Audio — SoundManager (pre-Howler cue dispatcher)
 * Hub:          .docs/plans/planning.spec.MD §7 Audio · §6.1 (DoD) · D02 Howler staging
 * Requirements: RES-02 (collection SFX later), ENM-05 (MiniBoss telegraph later), RUL-12
 * Change type:  new
 * POC-1 origin: none (POC-1 had no audio)
 * Test file:    poc2/src/audio/sound-manager.test.ts
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Orchestrator
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Scope ────────────────────────────────────────────────────────────────
/**
 * Owns:      One-shot SFX cue dispatch for gameplay events. Named methods such as
 *            playOverheatCue() are the contract behaviours call; play(id) is the
 *            generic bus. Howler is not installed yet — emit is silent until the
 *            §7 Audio Howler backend lands post-G1.
 * Does not own: music beds, radio waveform HUD, asset loading, pause-menu volume
 *            UI (G11 / RUL-14). Weapon cadence and overheat timers (D02).
 * Player-facing: today, nothing audible. After Howler, laser overheat ticks,
 *            hits, pickups and telegraphs share this same call site.
 */

// ─── 8. Requires ─────────────────────────────────────────────────────────────
/**
 * Upstream:
 *   SDD-A01 Balancer — BALANCE.audio master/sfx/music volumes and default mute
 *   SDD-D02 Weapon   — LaserBehaviour.playOverheatCue() is the first consumer
 *   SDD-G03 RunScene — constructs / disposes SoundManager; injects SoundPort
 *
 * Downstream:
 *   SDD-D02 LaserBehaviour — WeaponDeps.sound
 *   SDD-F05 VfxManager     — hit / destroy cues (later)
 *   SDD-G07 HUD / F02      — collection pitch per type (later)
 *   §7 Audio Howler backend — replaces the silent emit() without changing cues
 */

// ─── 9. Agent sign-off ───────────────────────────────────────────────────────
/**
 * Orchestrator : 2026-08-24  cue dispatcher before Howler; todo + README
 * Programming  : 2026-08-24  SoundPort + named playOverheatCue; no Howler import
 * Game Design  : 2026-08-24  BALANCE.audio volumes; overheat is a soft tick
 * TDD          : 2026-08-24  cases named; sound-manager.test.ts
 *
 * DoD (§6.1): spec · tests red · shape · lifecycle · BALANCE · memory ·
 *             IDs · verify green · port fidelity
 * Status: implemented
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Programming / Three.js
// ═════════════════════════════════════════════════════════════════════════════

// ─── 2. Contract ─────────────────────────────────────────────────────────────
/**
 * Lib: none until Howler (post-G1). Pure logic; no THREE, no DOM Audio.
 * Injection: RunWorld constructs one SoundManager and passes it as
 *            WeaponDeps.sound. Behaviours never import Howler.
 */

export type SfxCueId = 'laser-overheat' | 'explosion'

export interface SoundPort {
  play(id: SfxCueId): void
  playOverheatCue(): void
  playExplosionCue(): void
}

export interface AudioConfig {
  readonly masterVolume: number
  readonly sfxVolume: number
  readonly musicVolume: number
  readonly muted: boolean
}

export interface SoundManagerOptions {
  readonly config?: AudioConfig
}

export declare class SoundManager implements SoundPort {
  constructor(options?: SoundManagerOptions)

  readonly masterVolume: number
  readonly sfxVolume: number
  readonly musicVolume: number
  readonly muted: boolean
  readonly lastCue: SfxCueId | null

  play(id: SfxCueId): void
  playOverheatCue(): void
  setMuted(muted: boolean): void
  update(dt: number): void
  dispose(): void
}

// ─── 3. Key fields and methods ───────────────────────────────────────────────
/**
 *   field          | type              | meaning / unit / range
 *   ---------------|-------------------|-----------------------
 *   masterVolume   | number            | 0–1 mixer, from BALANCE.audio
 *   sfxVolume      | number            | 0–1 oneshots
 *   musicVolume    | number            | 0–1 beds (unused until Howler)
 *   muted          | boolean           | swallows emit; still records lastCue
 *   lastCue        | SfxCueId | null   | last play() id (tests / debugger)
 *
 *   play(id)           — records lastCue; no-op emit while muted or disposed
 *   playOverheatCue()  — play('laser-overheat'); LaserBehaviour calls this
 *   playExplosionCue() — play('explosion'); DeathTrigger calls this
 *   setMuted(muted)    — runtime mute (pause / settings later)
 *   update(dt)         — reserved for fades; no-op today
 *   dispose()          — drops lastCue; further play() is ignored
 */

// ─── 5. Rules and invariants ─────────────────────────────────────────────────
/**
 *   R1. playOverheatCue() is exactly play('laser-overheat').
 *   R1b. playExplosionCue() is exactly play('explosion').
 *   R2. play(id) stores lastCue = id even when muted (event was received).
 *   R3. muted or disposed: emit is skipped (no Howler / no Audio).
 *   R4. Volumes default to BALANCE.audio; constructor options override.
 *   R5. Memory: created-once per run; dispose() is idempotent. No GPU.
 *   R6. Per-frame allocation: none. play / update / playOverheatCue allocate 0.
 *   R7. Module must not import 'three' or 'howler'.
 *   R8. LaserBehaviour.playOverheatCue() forwards to WeaponDeps.sound when
 *       injected; missing sound is a silent no-op (tests without a world).
 */

// ─── 6. View / syncRender ────────────────────────────────────────────────────
/**
 * Visual:      N/A — no visual
 * Inheritance: N/A (pure logic)
 * syncRender writes: N/A
 * Never writes: gameplay state
 * Scene ownership: RunWorld constructs; RunScene disposes via soundManager()
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: Game Design
// ═════════════════════════════════════════════════════════════════════════════

// ─── 4. BALANCE, feel, leveling, graphics ────────────────────────────────────
/**
 *   BALANCE.audio.masterVolume  = 1      // full mixer; settings scale this later
 *   BALANCE.audio.sfxVolume     = 1      // oneshots sit at unity under master
 *   BALANCE.audio.musicVolume   = 0.65   // beds quieter than SFX when Howler lands
 *   BALANCE.audio.muted         = false  // default audible; pause may mute later
 *
 * Feel:      Laser overheat is a soft cool-down tick, not an alarm. After Howler,
 *            keep it short and mid — the player already sees the barrel pause.
 * Leveling:  N/A — cue identity does not change with weapon level.
 * Graphics:  N/A
 * Pillars:   feedback (the gun has a voice) without stealing HUD attention.
 */

// ═════════════════════════════════════════════════════════════════════════════
// AGENT: TDD
// ═════════════════════════════════════════════════════════════════════════════

// ─── 7. Acceptance → executable cases ────────────────────────────────────────
/**
 * File: poc2/src/audio/sound-manager.test.ts
 * Runner: vitest (`npm run test` in poc2/)
 * Mocks: optional AudioConfig; no Howler; no THREE
 *
 * describe('SoundManager')
 *   it('playOverheatCue records lastCue laser-overheat')              // R1
 *   it('playExplosionCue records lastCue explosion')                  // R1b
 *   it('play(id) records lastCue even when muted')                    // R2
 *   it('muted skips emit but still records lastCue')                  // R3
 *   it('disposed play is ignored and lastCue stays null')             // R3, R5
 *   it('defaults volumes and mute from BALANCE.audio')                // R4
 *   it('constructor config overrides BALANCE.audio')                  // R4
 *   it('play and update allocate no objects')                         // R6
 *   it('module does not import three or howler')                      // R7
 *
 * LaserBehaviour (weapon.test.ts):
 *   it('playOverheatCue dispatches the laser-overheat sfx cue')       // R8
 *
 * Manual:
 *   A-manual-1. [manual] after Howler: 15 laser volleys play a soft tick, then
 *               0.5s silence on the barrel; releasing fire never ticks.
 */
