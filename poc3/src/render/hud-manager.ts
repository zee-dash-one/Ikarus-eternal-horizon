import type { PerspectiveCamera } from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { SummarySnapshot, WorldSnapshot } from '../core/world-snapshot.ts'

export interface HudCombatExtras {
  readonly activeWeapon: string
  readonly weaponLevel: number
  readonly highScore: number
  readonly craftPct: number | null
  readonly craftName: string | null
}

export interface HudProjectContext {
  readonly camera: PerspectiveCamera
  readonly canvas: HTMLCanvasElement
}

const HIGH_SCORE_KEY = 'ikarus_poc3_high'

function padScore(value: number): string {
  return String(Math.floor(value)).padStart(7, '0')
}

function weaponLabel(id: string, level: number): string {
  return `${id.toUpperCase()} L${level}`
}

function bombDots(count: number): string {
  return '●'.repeat(Math.max(0, count))
}

function craftBar(pct: number): string {
  const filled = Math.round((pct / 100) * 5)
  const empty = 5 - filled
  return `[${'='.repeat(filled)}${'-'.repeat(empty)}]`
}

function formatHudStatsBar(summary: SummarySnapshot): string {
  const pad = (n: number, w: number) => String(Math.round(n)).padStart(w, ' ')
  const ene = `ENE: ${pad(summary.ENE, 3)} / ${pad(summary.eneMax, 3)}`
  const int = `INT: ${pad(summary.HP, 3)} / ${pad(summary.integrityMax, 3)}`
  const shd = `SHD: ${pad(summary.SHD, 3)} / ${pad(summary.shdMax, 3)}`
  return `[         ${ene}       ${int}        ${shd}         ]`
}

/** Combat HUD — corners + stats bar (HUD-01..04). Craft rings are 3D on ship. */
export class HudManager {
  private readonly _root: HTMLElement
  private readonly _pilot: HTMLElement
  private readonly _radio: HTMLElement
  private readonly _ai: HTMLElement
  private readonly _score: HTMLElement
  private readonly _kills: HTMLElement
  private readonly _high: HTMLElement
  private readonly _craftSlot: HTMLElement
  private readonly _craftBuild: HTMLElement
  private readonly _primary: HTMLElement
  private readonly _special: HTMLElement
  private readonly _statsBar: HTMLElement
  private _visible = false
  private _aiIndex = 0
  private _aiTimer = 0

  constructor(host: HTMLElement) {
    const hud = BALANCE.hud
    this._root = document.createElement('div')
    this._root.id = 'hud-root'
    this._root.className = 'hud'
    this._root.hidden = true
    this._root.style.setProperty('--hud-text', hud.colors.text)
    this._root.style.setProperty('--hud-dim', hud.colors.dim)
    this._root.style.setProperty('--hud-accent', hud.colors.accent)
    this._root.style.setProperty('--hud-font', hud.fontFamily)
    this._root.style.setProperty('--hud-size', `${hud.fontSizePx}px`)
    this._root.style.setProperty('--hud-pad', `${hud.edgePaddingPx}px`)
    this._root.style.setProperty('--hud-gap', `${hud.lineGapPx}px`)

    host.appendChild(this._root)

    const tl = this._corner('tl')
    this._pilot = this._line(tl)
    this._radio = this._line(tl)
    this._ai = this._line(tl)

    const tr = this._corner('tr')
    this._score = this._line(tr)
    this._kills = this._line(tr)
    this._high = this._line(tr)

    const bl = this._corner('bl')
    this._craftSlot = this._line(bl)
    this._craftBuild = this._line(bl)
    this._craftBuild.hidden = true

    const br = this._corner('br')
    this._primary = this._line(br)
    this._special = this._line(br)

    this._statsBar = document.createElement('div')
    this._statsBar.className = 'hud__stats-bar'
    this._root.appendChild(this._statsBar)
  }

  static readHighScore(): number {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY)
      if (raw) {
        const n = Number(raw)
        if (Number.isFinite(n) && n >= 0) {
          return n
        }
      }
    } catch {
      /* private mode */
    }
    return BALANCE.hud.stubs.defaultHighScore
  }

  static writeHighScoreIfBetter(score: number): void {
    const best = HudManager.readHighScore()
    if (score <= best) {
      return
    }
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)))
    } catch {
      /* ignore */
    }
  }

  setVisible(visible: boolean): void {
    this._visible = visible
    this._root.hidden = !visible
  }

  setPausedDimmed(dimmed: boolean): void {
    this._root.style.opacity = dimmed ? String(BALANCE.hud.pausedOpacity) : '1'
  }

  syncRender(
    snapshot: WorldSnapshot,
    extras: HudCombatExtras,
    _project: HudProjectContext,
    dt = 1 / 60,
  ): void {
    if (!this._visible) {
      return
    }

    const stubs = BALANCE.hud.stubs
    this._aiTimer += dt
    if (this._aiTimer >= 8) {
      this._aiTimer = 0
      this._aiIndex = (this._aiIndex + 1) % stubs.aiLines.length
    }

    this._pilot.textContent = `[PILOT STATUS: ${stubs.pilotStatus}]`
    this._radio.textContent = `[${stubs.radioLabel}]`
    const aiLine = stubs.aiLines[this._aiIndex] ?? stubs.aiLines[0] ?? ''
    this._ai.textContent = `AI: "${aiLine}"`

    this._score.textContent = `[SCORE: ${padScore(snapshot.score)}]`
    this._kills.textContent = `[KILLS: ${snapshot.kills}]`
    this._high.textContent = `[HIGH: ${padScore(extras.highScore)}]`

    this._craftSlot.textContent = `[${stubs.craftSlotLabel} ${extras.craftPct === null ? '0/1' : '1/1'}]`
    if (extras.craftPct !== null && extras.craftName) {
      this._craftBuild.hidden = false
      this._craftBuild.textContent = `Build: ${craftBar(extras.craftPct)} ${extras.craftPct}% [${extras.craftName}]`
    } else {
      this._craftBuild.hidden = true
    }

    this._primary.textContent = `[PRIMARY: ${weaponLabel(extras.activeWeapon, extras.weaponLevel)}]`
    const charges = stubs.bombCharges
    this._special.textContent = `[SPECIAL: ${stubs.bombName} x${charges} [${bombDots(charges)}]]`

    this._statsBar.textContent = formatHudStatsBar(snapshot.summary)
  }

  dispose(): void {
    this._root.remove()
  }

  private _corner(pos: 'tl' | 'tr' | 'bl' | 'br'): HTMLElement {
    const el = document.createElement('div')
    el.className = `hud__corner hud__corner--${pos}`
    this._root.appendChild(el)
    return el
  }

  private _line(parent: HTMLElement): HTMLElement {
    const el = document.createElement('div')
    el.className = 'hud__line'
    parent.appendChild(el)
    return el
  }
}
