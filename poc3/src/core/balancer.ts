const PARALLAX_GAIN_UNIT = 0.015

export interface LayoutBalance {
  readonly aspect: number
  readonly letterboxColor: number
  readonly cssWidth: number
  readonly cssHeight: number
  readonly playfieldWidth: number
  readonly playfieldHeight: number
}

export interface RenderBalance {
  readonly background: number
  readonly pixelRatioCap: number
  readonly antialias: boolean
}

export interface LoopBalance {
  readonly dtClampSec: number
}

export interface GamepadControlsBalance {
  readonly deadzone: number
  readonly invertMoveZ: boolean
  readonly axes: { readonly moveX: number; readonly moveZ: number }
  /** Physical button index → virtual token (POC2 layout). */
  readonly buttons: Readonly<Record<string, string>>
}

export interface TouchControlsBalance {
  readonly deadzone: number
  readonly stickSize: number
  readonly stickColor: string
  /** On-screen button slots → virtual token. */
  readonly slots: Readonly<Record<string, string>>
}

export interface MouseControlsBalance {
  /** Min pointer delta (px) at sensitivity 1× to register a steer hold. */
  readonly moveHoldThresholdBase: number
  /** Ms without qualifying movement before virtual hold releases. */
  readonly moveHoldGraceMs: number
}

export interface ControlsBalance {
  readonly keyboard: Readonly<Record<string, string>>
  readonly mix: Readonly<Record<string, string>>
  readonly mouse: MouseControlsBalance
  readonly gamepad: GamepadControlsBalance
  readonly touch: TouchControlsBalance
}

export interface LaserWeaponBalance {
  readonly color: number
  readonly rate: number
  readonly energyPerShot: number
  readonly damage: number
  readonly poolSize: number
  readonly muzzleOffsetZ: number
  readonly speed: number
  readonly radius: number
  readonly lifetime: number
}

export interface WeaponsBalance {
  readonly loadout: readonly string[]
  readonly laser: LaserWeaponBalance
}

export interface HudColorsBalance {
  readonly text: string
  readonly dim: string
  readonly accent: string
}

export interface HudStubsBalance {
  readonly pilotStatus: string
  readonly radioLabel: string
  readonly aiLines: readonly string[]
  readonly bombName: string
  readonly bombCharges: number
  readonly defaultHighScore: number
  readonly craftSlotLabel: string
}

export interface RgbaColor {
  readonly r: number
  readonly g: number
  readonly b: number
  readonly a: number
}

export interface HudRingSegmentBalance {
  readonly fill: RgbaColor
  readonly track: RgbaColor
  readonly outline: RgbaColor
}

export interface HudEulerDeg {
  readonly x: number
  readonly y: number
  readonly z: number
}

export interface HudRingsBalance {
  /** Master toggle — when false, ring object is hidden and not updated. */
  readonly enabled: boolean
  /** Show ring mesh (live toggle). */
  readonly visible: boolean
  /** Hide ring when integrity state is DEAD. */
  readonly hideWhenDead: boolean
  readonly sliceCount: number
  readonly gapDeg: number
  readonly bottomSliceDeg: number
  readonly energySlice: number
  readonly integritySlice: number
  readonly shieldSlice: number
  /** Bar thickness in world units (tube diameter). */
  readonly barWidthWorld: number
  /** Outline thickness in world units (each side). */
  readonly outlineWidthWorld: number
  /** Torus tube segments — higher = rounder caps. */
  readonly borderRadiusSegments: number
  readonly worldRadiusMul: number
  readonly worldRadiusPad: number
  /** Local offset from craft root (world units). */
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  /** Local euler offset (degrees, YXZ) — added on top of autoRotationFromCamera. */
  readonly rotation: HudEulerDeg
  /** Derive base rotation from BALANCE.camera so the ring faces the initial view. */
  readonly autoRotationFromCamera: boolean
  /** Master opacity multiplier for the whole ring group (0–1). */
  readonly opacity: number
  readonly renderOrder: number
  readonly energy: HudRingSegmentBalance
  readonly integrity: HudRingSegmentBalance
  readonly shield: HudRingSegmentBalance
}

export function rgbaToCss(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
}

export function rgbaToThree(color: RgbaColor): { readonly color: number; readonly opacity: number } {
  return {
    color: (color.r << 16) | (color.g << 8) | color.b,
    opacity: color.a,
  }
}

export function shipHudRingRadiusWorld(): number {
  const size = BALANCE.player.visual.size
  const rings = BALANCE.hud.rings
  const hullR = Math.hypot(size.w, size.d) * 0.5
  return hullR * rings.worldRadiusMul + rings.worldRadiusPad
}

export interface HudBalance {
  readonly fontFamily: string
  readonly fontSizePx: number
  readonly edgePaddingPx: number
  readonly lineGapPx: number
  readonly pausedOpacity: number
  readonly colors: HudColorsBalance
  readonly stubs: HudStubsBalance
  readonly rings: HudRingsBalance
}

/** Camera pose in degrees (POC2 GameCamera convention). */
export interface CameraBalance {
  readonly fov: number
  readonly near: number
  readonly far: number
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number }
}

export interface FollowBounceBalance {
  readonly timeMs: number
}

export interface FollowRecenterBalance {
  readonly delayMs: number
  readonly stillMs: number
  readonly accel: number
  readonly maxSpeed: number
}

export interface FollowBoxBalance {
  readonly halfX: number
  readonly halfZ: number
  readonly bounce: FollowBounceBalance
  readonly recenter: FollowRecenterBalance
  readonly anchor: { readonly x: number; readonly z: number }
  readonly restLine: { readonly position: { readonly x: number; readonly z: number } }
}

export interface ParallaxLayerBalance {
  readonly name: string
  readonly count: number
  readonly speed: number
  readonly speedJitter: number
  readonly parallaxGain: number
  readonly size: number
  readonly color: number
  readonly alpha: number
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number }
  readonly gridSize: number
  readonly gridColor: number
  readonly gridOpacity: number
  readonly zNearWrap: number
  readonly zFar: number
}

export interface ParallaxBalance {
  readonly layers: readonly ParallaxLayerBalance[]
}

export interface WorldBalance {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
  readonly despawnMargin: number
  readonly despawn: { readonly margin: number }
}

export interface SheetBalance {
  readonly playerDefaults: {
    readonly integrity_max: number
    readonly DEF: number
    readonly SPD: number
    readonly ENE_max: number
    readonly SHD_max: number
    readonly REG: number
  }
}

/** POC2 gameplay.energy + ship.cooldowns.recoveringMs. */
export interface EnergyBalance {
  readonly recoveringMs: number
}

export interface PlayerMotionBalance {
  readonly maxSpeed: number
  readonly accel: number
  readonly decel: number
  readonly brake: number
}

export interface PlayerTiltBalance {
  readonly axis: 'y' | 'z'
  readonly sign: 1 | -1
  readonly maxDeg: number
  readonly riseMs: number
  readonly fallMs: number
}

export interface PlayerDashBalance {
  readonly speedMul: number
  readonly durationMs: number
  readonly energyCost: number
}

/** Post-action status tails — see ShipStatusTracker (char-sheet). */
export interface PlayerCooldownBalance {
  readonly dashingMs: number
  readonly shootingMs: number
  readonly bombingMs: number
}

export interface ShipVisualBalance {
  readonly size: { readonly w: number; readonly h: number; readonly d: number }
  readonly wireframeColor: number
  readonly accentColor: number
  readonly thrusterColor: number
}

export interface ThrusterBalance {
  readonly position: { readonly y: number }
  readonly length: number
  readonly width: number
}

export interface PlayerBalance {
  readonly motion: PlayerMotionBalance
  readonly tilt: PlayerTiltBalance
  readonly dash: PlayerDashBalance
  readonly cooldowns: PlayerCooldownBalance
  readonly visual: ShipVisualBalance
  readonly thruster: ThrusterBalance
  readonly integritySpeedMul: {
    readonly LIGHT: number
    readonly MEDIUM: number
    readonly SEVERE: number
    readonly DRIFTING: number
  }
}

export interface AuthGuestStubBalance {
  /** POC slice: skip Login when probeSession is empty. Disable for real auth QA. */
  readonly enabled: boolean
  readonly userId: string
  readonly displayName: string
}

export interface AuthBalance {
  readonly guestStub: AuthGuestStubBalance
}

export interface BalanceConfig {
  readonly layout: LayoutBalance
  readonly render: RenderBalance
  readonly auth: AuthBalance
  readonly controls: ControlsBalance
  readonly loop: LoopBalance
  readonly camera: CameraBalance
  readonly followBox: FollowBoxBalance
  readonly parallax: ParallaxBalance
  readonly world: WorldBalance
  readonly sheet: SheetBalance
  readonly energy: EnergyBalance
  readonly player: PlayerBalance
  readonly weapons: WeaponsBalance
  readonly hud: HudBalance
}

export const BALANCE: BalanceConfig = {
  layout: {
    aspect: 16 / 9,
    letterboxColor: 0x05040a,
    cssWidth: 1280,
    cssHeight: 720,
    playfieldWidth: 480,
    playfieldHeight: 190,
  },
  render: {
    background: 0x05040a,
    pixelRatioCap: 2,
    antialias: true,
  },
  auth: {
    guestStub: {
      enabled: true,
      userId: 'stub:ikarus',
      displayName: 'IKARUS',
    },
  },
  controls: {
    keyboard: {
      KeyW: 'Up',
      KeyS: 'Down',
      KeyA: 'Left',
      KeyD: 'Right',
      KeyF: 'A',
      KeyT: 'B',
      KeyG: 'X',
      KeyY: 'Y',
      Space: 'R1',
    },
    mix: {
      KeyW: 'Up',
      KeyS: 'Down',
      KeyA: 'Left',
      KeyD: 'Right',
      KeyF: 'A',
      KeyT: 'B',
      KeyG: 'X',
      KeyY: 'Y',
      Space: 'R1',
      Mouse0: 'A',
      Mouse2: 'B',
    },
    mouse: {
      moveHoldThresholdBase: 8,
      moveHoldGraceMs: 500,
    },
    gamepad: {
      deadzone: 0.18,
      invertMoveZ: false,
      axes: { moveX: 0, moveZ: 1 },
      buttons: {
        '0': 'B',
        '1': 'Y',
        '2': 'X',
        '3': 'A',
        '5': 'R1',
        '9': 'Start',
      },
    },
    touch: {
      deadzone: 0.18,
      stickSize: 120,
      stickColor: '#22d3ee',
      slots: {
        fire: 'A',
        bomb: 'B',
        switchWeapon: 'X',
        switchBomb: 'Y',
        dash: 'R1',
        pause: 'Start',
      },
    },
  },
  loop: {
    dtClampSec: 0.05,
  },
  camera: {
    fov: 110,
    near: 5,
    far: 5000,
    position: { x: 5, y: 12, z: 7 },
    rotation: { x: -40, y: 24, z: -14 },
  },
  followBox: {
    halfX: 16,
    halfZ: 8,
    bounce: { timeMs: 500 },
    recenter: {
      delayMs: 1500,
      stillMs: 800,
      accel: 3,
      maxSpeed: 12,
    },
    anchor: { x: 0, z: -3 },
    restLine: { position: { x: 0, z: 0 } },
  },
  parallax: {
    layers: [
      {
        name: 'background_stars',
        count: 400,
        speed: 0.2 * PARALLAX_GAIN_UNIT,
        speedJitter: 0.5,
        parallaxGain: 0.015 * PARALLAX_GAIN_UNIT,
        size: 1,
        color: 0xa5e8ff,
        alpha: 0.5,
        position: { x: 0, y: -500, z: 100 },
        rotation: { x: 0, y: 0, z: 0 },
        gridSize: 2000,
        gridColor: 0x555555,
        gridOpacity: 0,
        zNearWrap: 0,
        zFar: -2000,
      },
      {
        name: 'solar_system',
        count: 300,
        speed: 0.2 * 15,
        speedJitter: 0.5,
        parallaxGain: 0.015 * 15,
        size: 1,
        color: 0xd97706,
        alpha: 0.5,
        position: { x: 0, y: -350, z: 100 },
        rotation: { x: 0, y: 0, z: 0 },
        gridSize: 2000,
        gridColor: 0x555555,
        gridOpacity: 0,
        zNearWrap: 0,
        zFar: -2000,
      },
      {
        name: 'debris',
        count: 150,
        speed: 0.2 * 20,
        speedJitter: 0.5,
        parallaxGain: 0.015 * 20,
        size: 1,
        color: 0x7c68ff,
        alpha: 0.5,
        position: { x: 0, y: -250, z: 100 },
        rotation: { x: 0, y: 0, z: 0 },
        gridSize: 2000,
        gridColor: 0x555555,
        gridOpacity: 0,
        zNearWrap: 0,
        zFar: -2000,
      },
    ],
  },
  world: {
    minX: -240,
    maxX: 240,
    minZ: -160,
    maxZ: 30,
    despawnMargin: 12,
    despawn: { margin: 12 },
  },
  sheet: {
    playerDefaults: {
      integrity_max: 100,
      DEF: 10,
      SPD: 12,
      ENE_max: 100,
      SHD_max: 100,
      REG: 8,
    },
  },
  energy: {
    recoveringMs: 500,
  },
  player: {
    motion: {
      maxSpeed: 12,
      accel: 60,
      decel: 60,
      brake: 120,
    },
    tilt: {
      axis: 'z',
      sign: -1,
      maxDeg: 22,
      riseMs: 150,
      fallMs: 200,
    },
    dash: {
      speedMul: 1.55,
      durationMs: 500,
      energyCost: 2,
    },
    cooldowns: {
      dashingMs: 300,
      shootingMs: 300,
      bombingMs: 1200,
    },
    visual: {
      size: { w: 1.5, h: 1, d: 2 },
      wireframeColor: 0x22d3ee,
      accentColor: 0x6d28d9,
      thrusterColor: 0x60c5ff,
    },
    thruster: {
      position: { y: -0.55 },
      length: 0.5,
      width: 0.3,
    },
    integritySpeedMul: {
      LIGHT: 1,
      MEDIUM: 0.85,
      SEVERE: 0.7,
      DRIFTING: 0.5,
    },
  },
  weapons: {
    loadout: ['laser'],
    laser: {
      color: 0x22d3ee,
      rate: 10,
      energyPerShot: 0.25,
      damage: 40,
      poolSize: 128,
      muzzleOffsetZ: -1.4,
      speed: 30,
      radius: 0.12,
      lifetime: 2,
    },
  },
  hud: {
    fontFamily: '"Courier New", Courier, monospace',
    fontSizePx: 13,
    edgePaddingPx: 16,
    lineGapPx: 4,
    pausedOpacity: 0.35,
    colors: {
      text: '#7dd3fc',
      dim: '#38bdf8',
      accent: '#22d3ee',
    },
    stubs: {
      pilotStatus: 'OPERATOR - IKARUS (IDENTITY: CLASSIFIED)',
      radioLabel: 'RADIO WAVEFORM ~~~',
      aiLines: [
        'Corruption signatures confirmed.',
        'Maintain formation. Hostiles inbound.',
        'Shield harmonics stable.',
      ],
      bombName: 'NOVA BOMB',
      bombCharges: 3,
      defaultHighScore: 250_000,
      craftSlotLabel: 'CRAFTING SLOT',
    },
    rings: {
      enabled: true,
      visible: true,
      hideWhenDead: true,
      sliceCount: 5,
      gapDeg: 16,
      bottomSliceDeg: -30,
      energySlice: 0,
      integritySlice: 1,
      shieldSlice: 4,
      barWidthWorld: 0.4,
      outlineWidthWorld: 0.02,
      borderRadiusSegments: 2,
      worldRadiusMul: 1.5,
      worldRadiusPad: 0.7,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 180 }, 
      autoRotationFromCamera: true,
      opacity: 1,
      renderOrder: 12,
      energy: {
        fill: { r: 255, g: 230, b: 0, a: 1 },
        track: { r: 255, g: 230, b: 0, a: 0.1 },
        outline: { r: 255, g: 255, b: 150, a: 0.25 },
      },
      integrity: {
        fill: { r: 255, g: 10, b: 40, a: 1 },
        track: { r: 255, g: 10, b: 40, a: 0.1 },
        outline: { r: 255, g: 255, b: 190, a: 0.25 },
      },
      shield: {
        fill: { r: 20, g: 80, b: 255, a: 1 },
        track: { r: 20, g: 80, b: 255, a: 0.1 },
        outline: { r: 20, g: 255, b: 255, a: 0.25 },
      },
    },
  },
}
