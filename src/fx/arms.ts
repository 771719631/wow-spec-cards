import gsap from 'gsap'
import { Graphics, Sprite, Texture } from 'pixi.js'
import { cardArtUrl, cardPoint, dimCard, punchCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const STEEL = 0xdce8f2
const COLD = 0x4a7aa8
const BRONZE = 0xc59442
const WOUND = 0xa52c2c
const SCARLET = 0xe44536
const SWEEP = 0x7ecbff

function add(layer: 'back' | 'front' | 'overlay', node: Graphics | Sprite): void {
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

function sparks(at: Point, color: number, count: number, spread: number): void {
  for (let i = 0; i < count; i++) {
    const g = new Graphics()
    g.blendMode = 'add'
    g.circle(0, 0, 1.3 + Math.random() * 2.4).fill({ color, alpha: 1 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 6,
      alpha: 0,
      duration: 0.28 + Math.random() * 0.12,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function ring(at: Point, color: number, from = 10, to = 52, duration = 0.28, width = 3): void {
  const g = new Graphics()
  g.circle(0, 0, from).stroke({ width, color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration, ease: 'power2.out' })
  fadeKill(g, duration)
}

function stamp(text: string, color: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  el.style.textShadow = '0 0 12px #000, 0 2px 0 #3a1010, -1px 0 0 #dce8f2'
  document.body.appendChild(el)
  return el
}

function heavySlash(
  from: Point,
  to: Point,
  opts: { angle?: number; width?: number; colors?: number[]; len?: number; duration?: number },
): void {
  const colors = opts.colors ?? [STEEL, COLD, WOUND]
  const widths = [opts.width ?? 10, (opts.width ?? 10) * 1.7, (opts.width ?? 10) * 2.2]
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const base = Math.atan2(to.y - from.y, to.x - from.x)
  const ang = opts.angle ?? base - 0.7
  const len = opts.len ?? Math.hypot(to.x - from.x, to.y - from.y) * 0.72 + 48
  colors.forEach((color, i) => {
    const g = new Graphics()
    g.blendMode = 'add'
    g.moveTo(-len / 2, 0).lineTo(len / 2, 0).stroke({
      width: widths[i] ?? 8,
      color,
      cap: 'round',
      alpha: i === 0 ? 0.98 : 0.55,
    })
    g.position.set(mx, my)
    g.rotation = ang
    add('front', g)
    gsap.to(g, { rotation: ang + 0.85, duration: opts.duration ?? 0.18, ease: 'power3.out' })
    fadeKill(g, 0.24, 0.06)
  })
}

function ghost(from: Point, url: string | null, tint = 0x9bb4c8): Sprite | null {
  if (!url) return null
  const sprite = new Sprite(Texture.from(url))
  sprite.anchor.set(0.5)
  sprite.width = from.w * 1.12
  sprite.height = from.h * 1.12
  sprite.alpha = 0.58
  sprite.tint = tint
  sprite.position.set(from.x, from.y)
  add('front', sprite)
  return sprite
}

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 6).fill({ color: BRONZE, alpha: 0.95 })
  g.circle(-2, -2, 2.2).fill({ color: STEEL, alpha: 0.9 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.32,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, BRONZE, 4, 18, 0.22, 2)
      g.destroy()
    },
  })
}

function emberToOrb(from: Point, skillId: string, color: number): void {
  const host = document.querySelector<HTMLElement>(`.skill-orb[data-skill="${skillId}"]`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 5).fill({ color, alpha: 0.95 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    duration: 0.22,
    ease: 'power2.in',
    onComplete: () => g.destroy(),
  })
}

function shieldBreak(at: Point): void {
  const drawShield = (offset: number, rot: number) => {
    const g = new Graphics()
    g.blendMode = 'add'
    g.roundRect(-22, -26, 44, 52, 6).stroke({ width: 3, color: 0xc9d4de, alpha: 0.9 })
    g.moveTo(0, -26).lineTo(0, 26).stroke({ width: 2, color: BRONZE, alpha: 0.85 })
    g.position.set(at.x + offset, at.y)
    g.rotation = rot
    add('front', g)
    return g
  }
  const left = drawShield(0, 0)
  const right = drawShield(0, 0)
  gsap.to(left, { x: at.x - 28, rotation: -0.5, alpha: 0, duration: 0.32, ease: 'power2.out', onComplete: () => left.destroy() })
  gsap.to(right, { x: at.x + 28, rotation: 0.5, alpha: 0, duration: 0.32, ease: 'power2.out', onComplete: () => right.destroy() })
  for (let i = 0; i < 8; i++) {
    const shard = new Graphics()
    shard.rect(-3, -1.5, 6, 3).fill({ color: 0xc9d4de, alpha: 0.9 })
    shard.position.set(at.x, at.y)
    add('front', shard)
    const ang = (Math.PI * 2 * i) / 8
    gsap.to(shard, {
      x: at.x + Math.cos(ang) * 42,
      y: at.y + Math.sin(ang) * 42,
      rotation: ang,
      alpha: 0,
      duration: 0.36,
      onComplete: () => shard.destroy(),
    })
  }
}

function groundCrack(at: Point, color: number): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 0, 36, 14).stroke({ width: 2, color, alpha: 0.7 })
  g.moveTo(-40, 4).lineTo(-8, 0).lineTo(12, 6).lineTo(38, -2).stroke({ width: 2, color, alpha: 0.55 })
  g.position.set(at.x, at.y + at.h * 0.42)
  add('back', g)
  fadeKill(g, 0.45, 0.12)
}

function playSweep(from: Point, secondary: Point): void {
  ring(secondary, SWEEP, 8, 36, 0.2, 2)
  const g = new Graphics()
  g.blendMode = 'add'
  const mx = (from.x + secondary.x) / 2
  const my = (from.y + secondary.y) / 2
  const ang = Math.atan2(secondary.y - from.y, secondary.x - from.x) - 0.35
  const len = Math.hypot(secondary.x - from.x, secondary.y - from.y) * 0.7 + 24
  g.moveTo(-len / 2, 0).lineTo(len / 2, 0).stroke({ width: 7, color: SWEEP, cap: 'round', alpha: 0.7 })
  g.moveTo(-len / 2, 0).lineTo(len / 2, 0).stroke({ width: 3, color: STEEL, cap: 'round', alpha: 0.85 })
  g.position.set(mx, my)
  g.rotation = ang
  add('front', g)
  gsap.to(g, { rotation: ang + 0.7, duration: 0.16, ease: 'power3.out' })
  fadeKill(g, 0.2, 0.04)
  sparks(secondary, STEEL, 7, 22)
}

export function playArmsFx(ctx: FxContext): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const from = cardPoint(ctx.actorUid)
  const to = ctx.targetUid ? cardPoint(ctx.targetUid) : from
  if (!from) {
    tl.add(() => ctx.onImpact())
    return tl
  }
  tl.timeScale(ctx.timeScale)
  if (ctx.skillId === 'aa') mortalStrike(tl, ctx, from, to)
  else if (ctx.skillId === 's1') colossusSmash(tl, ctx, from, to)
  else if (ctx.skillId === 's3') executeSlash(tl, ctx, from, to)
  else {
    tl.add(() => ctx.onImpact())
    tl.to({}, { duration: 0.2 })
  }
  return tl
}

function afterSweep(tl: gsap.core.Timeline, ctx: FxContext, from: Point, impactAt: number): void {
  if (!ctx.procSweep || !ctx.sweepUid) return
  const secondary = cardPoint(ctx.sweepUid)
  if (!secondary) return
  tl.add(() => {
    playSweep(from, secondary)
    punchCard(ctx.sweepUid!, 'light')
    shakeCamera(3, 0.12)
  }, impactAt + 0.1)
}

function mortalStrike(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  const shade = ghost(from, cardArtUrl(ctx.actorUid))
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    ring({ x: from.x, y: from.y + from.h * 0.42, w: 8, h: 8 }, BRONZE, 10, 40, 0.22, 2)
    if (shade) {
      shade.rotation = -0.45
      gsap.to(shade, { x: from.x + (target.x - from.x) * 0.22, y: from.y - 10, duration: 0.16 })
    }
  })
  tl.add(() => {
    if (shade) {
      gsap.to(shade, { x: target.x - 8, y: target.y - 6, rotation: 0.35, duration: 0.18, ease: 'power3.in' })
    }
  }, 0.16)
  tl.add(() => {
    heavySlash(from, target, { colors: [STEEL, COLD, WOUND], width: 9, angle: -0.85 })
    sparks(target, STEEL, 8, 26)
    sparks(target, WOUND, 5, 18)
    ring(target, WOUND, 8, 44, 0.22)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'heavy')
    shakeCamera(5, 0.18)
    ctx.onImpact()
    pearlToSp(target, ctx.side)
  }, 0.34)
  tl.to({}, { duration: 0.07 })
  afterSweep(tl, ctx, from, 0.34)
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.18)
  }, 0.58)
  tl.to({}, { duration: 0.18 })
}

function colossusSmash(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0xc9b48a)
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    emberToOrb(from, 's1', BRONZE)
    emberToOrb({ ...from, x: from.x + 10 }, 's1', STEEL)
  })
  tl.add(() => {
    groundCrack(from, BRONZE)
    gsap.to('.battle-center', { scale: 1.03, duration: 0.22, transformOrigin: '50% 45%' })
    if (shade) {
      gsap.to(shade, { y: from.y - 22, rotation: -0.7, duration: 0.24 })
    }
  }, 0.12)
  tl.add(() => {
    if (shade) gsap.to(shade, { x: target.x, y: target.y - 8, rotation: 0.2, duration: 0.16, ease: 'power3.in' })
    heavySlash(from, target, { colors: [STEEL, BRONZE], width: 14, angle: 1.45, len: 120, duration: 0.16 })
  }, 0.38)
  tl.add(() => {
    shieldBreak(target)
    groundCrack(target, BRONZE)
    sparks(target, BRONZE, 12, 34)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'crit')
    shakeCamera(12, 0.26)
    ctx.onImpact()
    gsap.to('.battle-center', { scale: 1, duration: 0.2 })
  }, 0.52)
  tl.to({}, { duration: 0.09 })
  afterSweep(tl, ctx, from, 0.52)
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.2)
  }, 0.82)
  tl.to({}, { duration: 0.2 })
}

function executeSlash(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x08060a, alpha: 0.22 })
  add('overlay', veil)
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0xb0c4d8)
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    emberToOrb(from, 's3', SCARLET)
    ring({ x: target.x, y: target.y + target.h * 0.42, w: 8, h: 8 }, SCARLET, 12, 48, 0.28, 3)
    if (shade) gsap.to(shade, { rotation: 0.5, y: from.y + 8, duration: 0.18 })
    gsap.to('.battle-center', { scale: 1.04, duration: 0.22, transformOrigin: '50% 45%' })
  })
  tl.add(() => {
    if (shade) {
      gsap.to(shade, { x: target.x - 4, y: target.y, rotation: -0.2, duration: 0.16, ease: 'power4.in' })
    }
    sparks(from, STEEL, 6, 16)
  }, 0.22)
  tl.add(() => {
    const flash = new Graphics()
    flash.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0xffffff, alpha: 0.55 })
    add('overlay', flash)
    fadeKill(flash, 0.06)
    heavySlash(from, target, { colors: [STEEL, COLD, SCARLET], width: 13, angle: 0.55, len: 150 })
    sparks(target, SCARLET, 14, 40)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'crit')
    shakeCamera(16, 0.3)
    ctx.onImpact()
    groundCrack(target, SCARLET)
  }, 0.42)
  tl.to({}, { duration: 0.1 })
  if (ctx.executeLow) {
    tl.add(() => {
      heavySlash(from, target, { colors: [SCARLET, WOUND], width: 8, angle: -0.95, len: 130, duration: 0.14 })
      ring(target, SCARLET, 10, 56, 0.24)
      punchCard(ctx.targetUid ?? ctx.actorUid, 'heavy')
      shakeCamera(8, 0.16)
    }, 0.54)
  }
  if (ctx.executeKill) {
    tl.add(() => {
      const mark = stamp('斩杀！', '#e44536')
      gsap.to(mark, { opacity: 0, duration: 0.4, delay: 0.35, onComplete() { mark.remove() } })
    }, 0.58)
  }
  afterSweep(tl, ctx, from, 0.42)
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.2)
    fadeKill(veil, 0.24)
    gsap.to('.battle-center', { scale: 1, duration: 0.22 })
  }, 0.92)
  tl.to({}, { duration: 0.28 })
}
