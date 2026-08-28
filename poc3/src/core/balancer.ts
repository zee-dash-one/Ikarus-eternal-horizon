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

export interface ControlsBalance {
  readonly keyboard: Readonly<Record<string, string>>
  readonly mix: Readonly<Record<string, string>>
  readonly gamepad: Readonly<Record<string, string>>
  readonly touch: Readonly<Record<string, string>>
}

export interface CameraBalance {
  readonly fov: number
  readonly near: number
  readonly far: number
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number }
}

export interface FollowBoxBalance {
  readonly halfWidth: number
  readonly halfHeight: number
  readonly bounceStrength: number
  readonly recenterSpeed: number
}

export interface ParallaxLayerBalance {
  readonly id: string
  readonly speed: number
  readonly color: number
  readonly count: number
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
  /** RUL-02 despawn box — same as despawnMargin for recycle checks. */
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

export interface PlayerMotionBalance {
  readonly accel: number
  readonly decel: number
  readonly brake: number
  readonly maxSpeedScale: number
  readonly bankMaxDeg: number
  readonly bankRiseMs: number
  readonly bankFallMs: number
}

export interface PlayerDashBalance {
  readonly impulse: number
  readonly durationTicks: number
  readonly energyCost: number
  readonly cooldownTicks: number
}

export interface PlayerBalance {
  readonly motion: PlayerMotionBalance
  readonly dash: PlayerDashBalance
  readonly craftColor: number
  readonly integritySpeedMul: {
    readonly LIGHT: number
    readonly MEDIUM: number
    readonly SEVERE: number
    readonly DRIFTING: number
  }
}

export interface BalanceConfig {
  readonly layout: LayoutBalance
  readonly render: RenderBalance
  readonly controls: ControlsBalance
  readonly loop: LoopBalance
  readonly camera: CameraBalance
  readonly followBox: FollowBoxBalance
  readonly parallax: ParallaxBalance
  readonly world: WorldBalance
  readonly sheet: SheetBalance
  readonly player: PlayerBalance
}

export const BALANCE: BalanceConfig = {
  layout: {
    aspect: 16 / 9,
    letterboxColor: 0x020408,
    cssWidth: 1280,
    cssHeight: 720,
    playfieldWidth: 48,
    playfieldHeight: 27,
  },
  render: {
    background: 0x020408,
    pixelRatioCap: 2,
    antialias: true,
  },
  controls: {
    keyboard: {
      KeyW: 'Up',
      KeyS: 'Down',
      KeyA: 'Left',
      KeyD: 'Right',
      Enter: 'Start',
      Space: 'A',
      KeyE: 'B',
      KeyQ: 'X',
      KeyR: 'Y',
      ShiftLeft: 'R1',
      ControlLeft: 'R2',
    },
    mix: {
      Space: 'A',
      Mouse0: 'A',
      Mouse2: 'B',
    },
    gamepad: {
      button0: 'A',
      button1: 'B',
      button2: 'X',
      button3: 'Y',
      button5: 'R1',
      button7: 'R2',
    },
    touch: {
      stick: 'move',
      buttonA: 'A',
    },
  },
  loop: {
    dtClampSec: 0.1,
  },
  camera: {
    fov: 55,
    near: 0.1,
    far: 500,
    position: { x: 0, y: 18, z: 24 },
    rotation: { x: -0.55, y: 0, z: 0 },
  },
  followBox: {
    halfWidth: 6,
    halfHeight: 4,
    bounceStrength: 0.35,
    recenterSpeed: 4,
  },
  parallax: {
    layers: [
      { id: 'far', speed: 0.15, color: 0x0a1628, count: 40 },
      { id: 'mid', speed: 0.35, color: 0x142238, count: 30 },
      { id: 'near', speed: 0.6, color: 0x1e3050, count: 20 },
    ],
  },
  world: {
    minX: -24,
    maxX: 24,
    minZ: -40,
    maxZ: 40,
    despawnMargin: 4,
    despawn: { margin: 4 },
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
  player: {
    motion: {
      accel: 42,
      decel: 28,
      brake: 56,
      maxSpeedScale: 1,
      bankMaxDeg: 28,
      bankRiseMs: 120,
      bankFallMs: 180,
    },
    dash: {
      impulse: 18,
      durationTicks: 12,
      energyCost: 15,
      cooldownTicks: 30,
    },
    craftColor: 0x88aaff,
    integritySpeedMul: {
      LIGHT: 1,
      MEDIUM: 0.8,
      SEVERE: 0.5,
      DRIFTING: 0.1,
    },
  },
}
