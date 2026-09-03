import gsap from 'gsap'
import { Graphics, Sprite, Texture } from 'pixi.js'
import { cardArtUrl, cardPoint, dimCard, punchCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

function addTemp(layer: 'back' | 'front' | 'overlay', node: Graphics | Sprite): void {
  const host = layer === 'back' ? backLayer : layer === 'overlay' ? overlayLayer : frontLayer
  host?.addChild(node)
}

function fadeKill(node: Graphics | Sprite, duration: number, delay = 0): gsap.core.Tween {
  return gsap.to(node, {
    alpha: 0,
    duration,
    delay,
    ease: 'power2.out',
    onComplete: () => node.destroy(),
  })
}

function slash(from: Point, to: Point, color: number, width: number, poison = false): Graphics {
  const g = new Graphics()
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const ang = Math.atan2(to.y - from.y, to.x - from.x) - 0.55
  const len = Math.hypot(to.x - from.x, to.y - from.y) * 0.62 + 40
  g.blendMode = 'add'
  g.moveTo(-len / 2, 0).lineTo(len / 2, 0).stroke({ width, color, cap: 'round', alpha: 0.95 })
  if (poison) {
    g.moveTo(-len / 2, 2).lineTo(len / 2, 2).stroke({ width: Math.max(2, width * 0.35), color: 0x3adf6a, cap: 'round', alpha: 0.85 })
  }
  g.position.set(mx, my)
  g.rotation = ang
  addTemp('front', g)
  gsap.to(g, { rotation: ang + 1.05, duration: 0.18, ease: 'power3.out' })
  fadeKill(g, 0.22, 0.08)
  return g
}

function sparks(at: Point, color: number, count: number, spread: number): void {
  for (let i = 0; i < count; i++) {
    const g = new Graphics()
    g.circle(0, 0, 1.4 + Math.random() * 2.2).fill({ color, alpha: 1 })
    g.position.set(at.x, at.y)
    addTemp('front', g)
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread,
      alpha: 0,
      duration: 0.28 + Math.random() * 0.12,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function ring(at: Point, color: number, from = 8, to = 46, duration = 0.28): void {
  const g = new Graphics()
  g.circle(0, 0, from).stroke({ width: 3, color, alpha: 0.95 })
  g.position.set(at.x, at.y)
  addTemp('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration, ease: 'power2.out' })
  fadeKill(g, duration)
}

function inkBurst(at: Point): void {
  const g = new Graphics()
  g.ellipse(0, 0, 10, 16).fill({ color: 0x0b0b0d, alpha: 0.72 })
  g.position.set(at.x + 8, at.y)
  addTemp('back', g)
  gsap.to(g, { alpha: 0, duration: 0.45, ease: 'sine.out' })
  gsap.to(g.scale, { x: 3.2, y: 2.4, duration: 0.45, onComplete: () => g.destroy() })
}

function flashScreen(alpha = 0.55, duration = 0.08): void {
  const g = new Graphics()
  g.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0xffffff, alpha })
  addTemp('overlay', g)
  fadeKill(g, duration)
}

function lockOn(at: Point): Graphics {
  const g = new Graphics()
  g.circle(0, 0, 44).stroke({ width: 3, color: 0xc93732, alpha: 0.95 })
  g.rect(-38, -48, 76, 96).stroke({ width: 1.5, color: 0xefd27a, alpha: 0.7 })
  g.moveTo(-12, 0).lineTo(12, 0).stroke({ width: 2, color: 0xefd27a })
  g.moveTo(0, -12).lineTo(0, 12).stroke({ width: 2, color: 0xefd27a })
  g.position.set(at.x, at.y - 10)
  addTemp('front', g)
  return g
}

function stamp(text: string, color: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  document.body.appendChild(el)
  return el
}

function ghostDash(from: Point, to: Point, url: string | null): void {
  const trail = new Graphics()
  trail.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 12, color: 0x16161c, alpha: 0.42 })
  addTemp('back', trail)
  fadeKill(trail, 0.3)

  const pass = {
    x: to.x + (to.x - from.x) * 0.16,
    y: to.y + (to.y - from.y) * 0.16,
  }
  if (!url) return
  const makeGhost = (alpha: number, scale: number, delay: number) => {
    const sprite = new Sprite(Texture.from(url))
    sprite.anchor.set(0.5)
    sprite.width = from.w * scale
    sprite.height = from.h * scale
    sprite.alpha = alpha
    sprite.tint = 0x778899
    sprite.position.set(from.x, from.y)
    addTemp('front', sprite)
    gsap.to(sprite, {
      x: pass.x,
      y: pass.y,
      alpha: 0,
      duration: 0.22,
      delay,
      ease: 'power3.in',
      onComplete: () => sprite.destroy(),
    })
  }
  makeGhost(0.38, 0.84, 0)
  makeGhost(0.52, 0.92, 0.04)
  makeGhost(0.82, 1, 0.07)
}

export function playOutlawFx(ctx: FxContext): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const from = cardPoint(ctx.actorUid)
  const to = ctx.targetUid ? cardPoint(ctx.targetUid) : from
  if (!from) {
    tl.add(() => ctx.onImpact())
    return tl
  }
  tl.timeScale(ctx.timeScale)

  if (ctx.skillId === 'aa') saberSlash(tl, ctx, from, to)
  else if (ctx.skillId === 's1') pistolShot(tl, ctx, from, to)
  else if (ctx.skillId === 's2') betweenTheEyes(tl, ctx, from, to)
  else rollTheBones(tl, ctx, from)
  return tl
}

function saberSlash(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    const mist = new Graphics()
    mist.circle(0, 0, 22).fill({ color: 0x111114, alpha: 0.58 })
    mist.position.set(from.x, from.y)
    addTemp('back', mist)
    gsap.to(mist.scale, { x: 2.4, y: 1.8, duration: 0.28 })
    fadeKill(mist, 0.3)
  })
  tl.add(() => {
    ghostDash(from, target, cardArtUrl(ctx.actorUid))
  }, 0.08)
  tl.add(() => {
    slash(from, target, 0xe8eef6, 7, true)
    sparks(target, 0x3adf6a, 8, 28)
    inkBurst(target)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'heavy')
    shakeCamera(6, 0.2)
    ctx.onImpact()
  }, 0.28)
  tl.to({}, { duration: 0.07 })
  tl.add(() => dimCard(ctx.actorUid, false), 0.5)
  tl.to({}, { duration: 0.22 })
}

function pistolShot(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  tl.add(() => {
    const flash = new Graphics()
    flash.blendMode = 'add'
    flash.circle(0, 0, 5).fill({ color: 0xffffff })
    flash.circle(0, 0, 11).fill({ color: 0xffe066, alpha: 0.72 })
    flash.circle(0, 0, 18).fill({ color: 0xff6a22, alpha: 0.35 })
    const side = from.x < target.x ? 1 : -1
    flash.position.set(from.x + side * from.w * 0.42, from.y)
    addTemp('front', flash)
    fadeKill(flash, 0.1)
  })
  tl.add(() => {
    const shot = new Graphics()
    shot.blendMode = 'add'
    shot.moveTo(from.x, from.y).lineTo(target.x, target.y).stroke({ width: 3, color: 0xffffff, alpha: 0.95 })
    shot.moveTo(from.x, from.y).lineTo(target.x, target.y).stroke({ width: 7, color: 0xefd27a, alpha: 0.32 })
    addTemp('front', shot)
    fadeKill(shot, 0.06)
  }, 0.04)
  tl.add(() => {
    ring(target, 0xffb347, 6, 38, 0.22)
    sparks(target, 0xffcc66, 10, 32)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'light')
    shakeCamera(5, 0.18)
    ctx.onImpact()
    const shell = new Graphics()
    shell.roundRect(-3, -1.5, 6, 3, 1).fill({ color: 0xefd27a })
    shell.position.set(from.x + 16, from.y + 8)
    addTemp('front', shell)
    gsap.to(shell, {
      x: from.x + 28,
      y: from.y + 36,
      rotation: 2.8,
      alpha: 0,
      duration: 0.4,
      onComplete: () => shell.destroy(),
    })
  }, 0.12)
  tl.to({}, { duration: 0.36 })
}

function betweenTheEyes(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x050308, alpha: 0.28 })
  addTemp('overlay', veil)
  const lock = lockOn(target)
  const mark = stamp('锁定', '#c93732')
  tl.to(lock.scale, { x: 0.7, y: 0.7, duration: 0.28 }, 0)
  tl.add(() => {
    gsap.to('.battle-center', { scale: 1.05, duration: 0.18, transformOrigin: '50% 45%' })
  }, 0.16)
  tl.to({}, { duration: 0.1 })
  tl.add(() => {
    flashScreen(0.72, 0.07)
    const shot = new Graphics()
    shot.blendMode = 'add'
    shot.moveTo(from.x, from.y).lineTo(target.x, target.y - 18).stroke({ width: 4, color: 0xffe7a0 })
    addTemp('front', shot)
    fadeKill(shot, 0.1)
    ring(target, 0xc93732, 8, 70, 0.32)
    sparks(target, 0xefd27a, 16, 48)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'crit')
    shakeCamera(12, 0.28)
    ctx.onImpact()
    lock.destroy()
    mark.remove()
    const crit = stamp('暴击', '#efd27a')
    gsap.to(crit, { opacity: 0, duration: 0.35, delay: 0.28, onComplete: () => crit.remove() })
    fadeKill(veil, 0.28)
    gsap.to('.battle-center', { scale: 1, duration: 0.22 })
  })
  tl.to({}, { duration: 0.42 })
}

function rollTheBones(tl: gsap.core.Timeline, ctx: FxContext, from: Point): void {
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x120806, alpha: 0.22 })
  addTemp('overlay', veil)
  const ground = new Graphics()
  ground.ellipse(0, 0, 70, 24).stroke({ width: 3, color: 0xc9a227, alpha: 0.85 })
  ground.position.set(from.x, from.y + from.h * 0.42)
  addTemp('back', ground)
  const dice: Graphics[] = []
  const starts = [
    { x: from.x - 90, y: from.y + 80 },
    { x: from.x + 90, y: from.y + 70 },
    { x: from.x, y: from.y - 110 },
    { x: from.x - 50, y: from.y - 40 },
    { x: from.x + 40, y: from.y - 20 },
  ]
  starts.forEach((p, i) => {
    const die = makeDie()
    die.position.set(p.x, p.y)
    die.scale.set(0.6 + (i % 3) * 0.18)
    addTemp('front', die)
    dice.push(die)
    tl.to(
      die,
      { x: from.x + (i - 2) * 22, y: from.y + 18, rotation: 2 + i, duration: 0.48, ease: 'power3.inOut' },
      0.05 * i,
    )
  })
  tl.add(() => {
    ring(from, 0xefd27a, 12, 80, 0.36)
    sparks(from, 0xc9a227, 14, 40)
    shakeCamera(10, 0.24)
    ctx.onImpact()
  }, 0.62)
  tl.add(() => {
    dice.forEach((die, i) => {
      gsap.to(die, { alpha: 0, y: from.y - 10, duration: 0.28, delay: i * 0.04, onComplete: () => die.destroy() })
    })
    fadeKill(ground, 0.3)
    fadeKill(veil, 0.3)
  }, 0.82)
  tl.to({}, { duration: 0.55 })
}

function makeDie(): Graphics {
  const g = new Graphics()
  g.roundRect(-10, -10, 20, 20, 3).fill({ color: 0xf4ead2 }).stroke({ width: 1.5, color: 0x8a6a16 })
  g.circle(-4, -4, 1.6).fill({ color: 0x2a1c10 })
  g.circle(4, 4, 1.6).fill({ color: 0x2a1c10 })
  g.circle(0, 0, 1.6).fill({ color: 0xc93732 })
  return g
}

export function playGenericFx(ctx: FxContext): gsap.core.Timeline {
  const tl = gsap.timeline()
  tl.timeScale(ctx.timeScale)
  const from = cardPoint(ctx.actorUid)
  const to = ctx.targetUid ? cardPoint(ctx.targetUid) : from
  if (!from) {
    tl.add(() => ctx.onImpact())
    return tl
  }
  tl.add(() => {
    if (to && ctx.targetUid && ctx.targetUid !== ctx.actorUid) slash(from, to, 0xf2d37a, 5)
    sparks(to ?? from, 0xefd27a, 7, 24)
    if (ctx.targetUid) punchCard(ctx.targetUid, 'light')
    shakeCamera(4, 0.16)
    ctx.onImpact()
  }, 0.12)
  tl.to({}, { duration: 0.28 })
  return tl
}
