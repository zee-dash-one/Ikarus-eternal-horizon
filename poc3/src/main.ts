import './style.css'
import { GameApp } from './game-app.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
const loginRoot = document.querySelector<HTMLElement>('#login-root')
const debuggerRoot = document.querySelector<HTMLElement>('#debugger-area')

if (!canvas || !loginRoot || !debuggerRoot) {
  throw new Error('Missing required DOM roots')
}

const app = new GameApp({ canvas, loginRoot, debuggerRoot })
void app.boot()
