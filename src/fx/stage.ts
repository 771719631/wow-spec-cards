import { Application, Container } from 'pixi.js'

let app: Application | null = null
export let backLayer: Container | null = null
export let frontLayer: Container | null = null
export let overlayLayer: Container | null = null

export async function ensureFxStage(root: HTMLElement): Promise<Application> {
  if (app) {
    if (app.canvas.parentElement !== root) root.appendChild(app.canvas)
    return app
  }
  const next = new Application()
  await next.init({
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    resizeTo: window,
  })
  next.canvas.className = 'fx-canvas'
  root.appendChild(next.canvas)
  backLayer = new Container()
  frontLayer = new Container()
  overlayLayer = new Container()
  next.stage.addChild(backLayer, frontLayer, overlayLayer)
  app = next
  return next
}

export function clearFxLayers(): void {
  for (const layer of [backLayer, frontLayer, overlayLayer]) {
    if (!layer) continue
    for (const child of [...layer.children]) child.destroy({ children: true })
  }
  document.querySelectorAll('.fx-stamp').forEach((node) => node.remove())
}

export async function destroyFxStage(): Promise<void> {
  clearFxLayers()
  if (!app) return
  app.destroy(true)
  app = null
  backLayer = null
  frontLayer = null
  overlayLayer = null
}
