import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { BALANCE } from '../core/balancer.ts'
import type { CameraState } from '../systems/camera-manager.ts'
import type { WorldSnapshot } from '../core/world-snapshot.ts'

export interface GameRendererOptions {
  readonly canvas: HTMLCanvasElement
}

export class GameRenderer {
  readonly scene: Scene
  readonly camera: PerspectiveCamera
  private readonly _renderer: WebGLRenderer

  constructor(options: GameRendererOptions) {
    this.scene = new Scene()
    const layout = BALANCE.layout
    const cam = BALANCE.camera
    this.camera = new PerspectiveCamera(
      cam.fov,
      layout.aspect,
      cam.near,
      cam.far,
    )
    this.camera.position.set(cam.position.x, cam.position.y, cam.position.z)
    this.camera.rotation.set(cam.rotation.x, cam.rotation.y, cam.rotation.z)

    this._renderer = new WebGLRenderer({
      canvas: options.canvas,
      antialias: BALANCE.render.antialias,
    })
    this._renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, BALANCE.render.pixelRatioCap),
    )
    this._renderer.setClearColor(BALANCE.render.background)
    this.resize(window.innerWidth, window.innerHeight)
  }

  resize(cssWidth: number, cssHeight: number): void {
    const aspect = BALANCE.layout.aspect
    let w = cssWidth
    let h = cssHeight
    const current = w / h
    if (current > aspect) {
      w = h * aspect
    } else {
      h = w / aspect
    }
    const letterboxTop = (cssHeight - h) / 2
    this._renderer.domElement.style.marginTop = `${letterboxTop}px`
    this._renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const lb = BALANCE.layout.letterboxColor
    this._renderer.domElement.style.background = `#${new Color(lb).getHexString()}`
  }

  syncCamera(state: CameraState): void {
    this.camera.position.set(state.x, state.y, state.z)
    this.camera.lookAt(state.lookX, state.lookY, state.lookZ)
  }

  render(): void {
    this._renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this._renderer.dispose()
  }
}

export function snapshotSummaryForHud(snapshot: WorldSnapshot): WorldSnapshot['summary'] {
  return snapshot.summary
}
