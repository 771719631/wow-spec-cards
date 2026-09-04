import gsap from 'gsap'
import { setCasting } from './camera'
import { playGenericFx, playOutlawFx } from './outlaw'
import { playBrewFx } from './brew'
import { playEleFx } from './ele'
import { playPriestFx } from './priest'
import { playDestroFx } from './destro'
import { playArmsFx } from './arms'
import { playProtFx } from './prot'
import { playRestoFx } from './resto'
import { playBmFx } from './bm'
import { playBloodFx } from './blood'
import { playArcaneFx } from './arcane'
import { playHavocFx } from './havoc'
import { playAugFx } from './aug'
import { clearFxLayers, destroyFxStage, ensureFxStage } from './stage'
import type { FxContext } from './types'
import { fxFor } from '../data/config-store'

let current: gsap.core.Timeline | null = null

export async function playBattleFx(ctx: FxContext): Promise<void> {
  const screen = document.querySelector<HTMLElement>('.battle-screen')
  if (!screen) {
    ctx.onImpact()
    return
  }
  try {
    await ensureFxStage(screen)
  } catch {
    ctx.onImpact()
    return
  }
  current?.kill()
  clearFxLayers()
  setCasting(true)
  let impacted = false
  const wrapped: FxContext = {
    ...ctx,
    onImpact: () => {
      if (impacted) return
      impacted = true
      ctx.onImpact()
    },
  }
  const fxName = fxFor(wrapped.specId, wrapped.skillId)
  const players: Record<string, (ctx: FxContext) => gsap.core.Timeline> = {
    outlaw: playOutlawFx,
    brew: playBrewFx,
    ele: playEleFx,
    priest: playPriestFx,
    destro: playDestroFx,
    arms: playArmsFx,
    prot: playProtFx,
    resto: playRestoFx,
    bm: playBmFx,
    blood: playBloodFx,
    arcane: playArcaneFx,
    havoc: playHavocFx,
    aug: playAugFx,
    generic: playGenericFx,
  }
  const tl = (players[fxName] ?? playGenericFx)(wrapped)
  current = tl
  if (wrapped.paused) tl.pause()
  const wallMs = Math.max(400, (tl.duration() / Math.max(tl.timeScale() || 1, 0.01)) * 1000 + 120)
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      if (!impacted) wrapped.onImpact()
      resolve()
    }
    tl.eventCallback('onComplete', finish)
    window.setTimeout(finish, wallMs)
    if (tl.duration() === 0 || tl.progress() === 1) finish()
  })
  if (current === tl) current = null
  setCasting(false)
  gsap.set('.battle-center', { x: 0, y: 0, scale: 1, clearProps: 'transform' })
}

export function setFxPaused(paused: boolean): void {
  if (!current) return
  if (paused) current.pause()
  else current.play()
}

export function interruptBattleFx(): void {
  current?.kill()
  current = null
  setCasting(false)
  clearFxLayers()
  gsap.set('.battle-center', { x: 0, y: 0, scale: 1, clearProps: 'transform' })
}

export async function stopBattleFx(): Promise<void> {
  interruptBattleFx()
  await destroyFxStage()
}
