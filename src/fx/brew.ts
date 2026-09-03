import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardPoint, punchCard, shakeCamera, swayCard } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const JADE = 0x5ee0a0
const AMBER = 0xe8a23a
const INK = 0x14120e
const BRONZE = 0xc9a06a
const BLOOD_AMBER = 0xc45a22

function addTemp(layer: 'back' | 'front' | 'overlay', node: Graphics): void {
  const host = layer === 'back' ? backLayer : layer === 'overlay' ? overlayLayer : frontLayer
  host?.addChild(node)
}

function fadeKill(node: Graphics, duration: number, delay = 0): gsap.core.Tween {
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
    g.circle(0, 0, 1.3 + Math.random() * 2).fill({ color, alpha: 1 })
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

function makeKeg(): Graphics {
  const g = new Graphics()
  g.roundRect(-9, -7, 18, 16, 4).fill({ color: 0x3a7a4a }).stroke({ width: 1.5, color: 0xefd27a })
  g.roundRect(-5, -12, 10, 6, 2).fill({ color: 0x2d5c3a }).stroke({ width: 1, color: BRONZE })
  g.circle(0, 1, 3).stroke({ width: 1.2, color: JADE, alpha: 0.9 })
  return g
}

function shards(at: Point): void {
  for (let i = 0; i < 7; i++) {
    const bit = new Graphics()
    bit.roundRect(-3, -1.5, 6, 3, 1).fill({ color: i % 2 ? 0x4a8a5a : 0xc47a28 })
    bit.position.set(at.x, at.y)
    bit.rotation = Math.random() * 3
    addTemp('front', bit)
    const ang = (Math.PI * 2 * i) / 7
    gsap.to(bit, {
      x: at.x + Math.cos(ang) * 28,
      y: at.y + Math.sin(ang) * 22,
      rotation: bit.rotation + 2,
      alpha: 0,
      duration: 0.32,
      ease: 'power2.out',
      onComplete: () => bit.destroy(),
    })
  }
}

function spBead(from: Point, side: 'player' | 'ai'): void {
  const row = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  const dest = row?.getBoundingClientRect()
  const bead = new Graphics()
  bead.circle(0, 0, 5).fill({ color: AMBER })
  bead.circle(0, 0, 7).stroke({ width: 1.5, color: 0xffe7a0, alpha: 0.8 })
  bead.position.set(from.x, from.y)
  addTemp('overlay', bead)
  const tx = dest ? dest.left + dest.width * 0.2 : from.x - 40
  const ty = dest ? dest.top + dest.height / 2 : from.y - 80
  gsap.to(bead, {
    x: tx,
    y: ty,
    duration: 0.22,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: tx, y: ty, w: 10, h: 10 }, AMBER, 4, 18, 0.18)
      bead.destroy()
    },
  })
}

export function playBrewFx(ctx: FxContext): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const from = cardPoint(ctx.actorUid)
  const to = ctx.targetUid ? cardPoint(ctx.targetUid) : from
  if (!from) {
    tl.add(() => ctx.onImpact())
    return tl
  }
  tl.timeScale(ctx.timeScale)
  if (ctx.skillId === 'aa') kegSmash(tl, ctx, from, to)
  else if (ctx.skillId === 's1') celestialBrew(tl, ctx, from, to)
  else if (ctx.skillId === 's3') invokeNiuzao(tl, ctx, from)
  else {
    tl.add(() => ctx.onImpact())
    tl.to({}, { duration: 0.2 })
  }
  return tl
}

function kegSmash(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  const ripple = new Graphics()
  ripple.ellipse(0, 0, 18, 8).stroke({ width: 2, color: AMBER, alpha: 0.8 })
  ripple.position.set(from.x, from.y + from.h * 0.38)
  addTemp('back', ripple)
  tl.add(() => {
    gsap.to(ripple.scale, { x: 2.2, y: 1.6, duration: 0.2 })
    fadeKill(ripple, 0.22)
  })
  const keg = makeKeg()
  keg.position.set(from.x + 16, from.y - 6)
  keg.scale.set(0.2)
  addTemp('front', keg)
  tl.to(keg.scale, { x: 1, y: 1, duration: 0.12 }, 0)
  const flight = { t: 0 }
  const lift = Math.min(70, Math.hypot(target.x - from.x, target.y - from.y) * 0.28 + 36)
  tl.to(
    flight,
    {
      t: 1,
      duration: 0.2,
      ease: 'none',
      onUpdate: () => {
        const t = flight.t
        keg.x = from.x + (target.x - from.x) * t
        keg.y = from.y + (target.y - from.y) * t - Math.sin(t * Math.PI) * lift
        keg.rotation = t * 6.4
      },
    },
    0.12,
  )
  tl.add(() => {
    keg.destroy()
    shards(target)
    ring(target, JADE, 8, 52, 0.22)
    sparks(target, AMBER, 12, 30)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'heavy')
    shakeCamera(6, 0.18)
    ctx.onImpact()
    spBead(target, ctx.side)
  })
  tl.to({}, { duration: 0.22 })
}

function celestialBrew(tl: gsap.core.Timeline, ctx: FxContext, from: Point, to: Point | null): void {
  const target = to ?? from
  const lotus = new Graphics()
  lotus.ellipse(0, 0, 22, 10).stroke({ width: 2, color: JADE, alpha: 0.85 })
  lotus.moveTo(-16, 0).lineTo(0, -14).lineTo(16, 0).stroke({ width: 1.5, color: JADE, alpha: 0.7 })
  lotus.position.set(target.x, target.y + target.h * 0.4)
  addTemp('back', lotus)
  const gourd = new Graphics()
  gourd.ellipse(0, 6, 10, 14).fill({ color: 0x2f6a40, alpha: 0.92 })
  gourd.ellipse(0, -8, 6, 7).fill({ color: 0x3d7d4e })
  gourd.circle(0, -12, 3).fill({ color: BRONZE })
  gourd.position.set(from.x, from.y - from.h * 0.42)
  gourd.alpha = 0
  addTemp('front', gourd)
  tl.to(gourd, { alpha: 1, y: from.y - from.h * 0.48, duration: 0.16 }, 0)
  tl.to(gourd, { rotation: 0.7, duration: 0.18 }, 0.12)
  const stream = new Graphics()
  stream.blendMode = 'add'
  addTemp('front', stream)
  const flow = { t: 0 }
  tl.to(
    flow,
    {
      t: 1,
      duration: 0.26,
      onUpdate: () => {
        stream.clear()
        const t = flow.t
        const mx = from.x + (target.x - from.x) * t
        const my = from.y + (target.y - from.y) * t - Math.sin(t * Math.PI) * 24
        stream.moveTo(from.x, from.y - 18).quadraticCurveTo(mx, my - 30, target.x, target.y)
        stream.stroke({ width: 4, color: JADE, alpha: 0.7 })
        stream.moveTo(from.x, from.y - 18).quadraticCurveTo(mx, my - 30, target.x, target.y)
        stream.stroke({ width: 1.6, color: 0xffe7a0, alpha: 0.5 })
      },
    },
    0.18,
  )
  tl.add(() => {
    stream.destroy()
    fadeKill(gourd, 0.2)
    const inner = new Graphics()
    inner.circle(0, 0, 28).stroke({ width: 2, color: JADE, alpha: 0.8 })
    inner.position.set(target.x, target.y)
    addTemp('front', inner)
    const hex = new Graphics()
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i
      const b = (Math.PI / 3) * (i + 1)
      hex.moveTo(Math.cos(a) * 34, Math.sin(a) * 34).lineTo(Math.cos(b) * 34, Math.sin(b) * 34)
    }
    hex.stroke({ width: 1.6, color: 0xefd27a, alpha: 0.9 })
    hex.position.set(target.x, target.y)
    addTemp('front', hex)
    const horn = new Graphics()
    horn.moveTo(-22, 8).lineTo(-8, -28).lineTo(0, -8).lineTo(8, -28).lineTo(22, 8)
    horn.stroke({ width: 2.4, color: 0x2a2418, alpha: 0.75 })
    horn.position.set(target.x, target.y - 6)
    addTemp('front', horn)
    fadeKill(inner, 0.4, 0.12)
    fadeKill(hex, 0.4, 0.16)
    fadeKill(horn, 0.32, 0.18)
    fadeKill(lotus, 0.3)
    const glyph = new Graphics()
    glyph.moveTo(-8, 6).lineTo(0, -10).lineTo(8, 6).stroke({ width: 2.5, color: 0xc93732 })
    glyph.moveTo(-8, 6).lineTo(0, -10).lineTo(8, 6).stroke({ width: 1.2, color: 0xefd27a })
    glyph.position.set(target.x, target.y - target.h * 0.42)
    addTemp('overlay', glyph)
    gsap.to(glyph, { y: target.y, alpha: 0, duration: 0.28, delay: 0.08, onComplete: () => glyph.destroy() })
    punchCard(ctx.targetUid ?? ctx.actorUid, 'light')
    ctx.onImpact()
  })
  tl.to({}, { duration: 0.36 })
}

function invokeNiuzao(tl: gsap.core.Timeline, ctx: FxContext, from: Point): void {
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x080704, alpha: 0.18 })
  addTemp('overlay', veil)
  const ink = new Graphics()
  ink.circle(0, 0, 16).fill({ color: INK, alpha: 0.72 })
  ink.position.set(from.x, from.y + 10)
  addTemp('back', ink)
  tl.to(ink.scale, { x: 6, y: 3.2, duration: 0.28, ease: 'power2.out' }, 0)
  const hoof = new Graphics()
  hoof.ellipse(0, 0, 18, 10).stroke({ width: 3, color: BRONZE, alpha: 0.9 })
  hoof.moveTo(-8, -4).lineTo(-12, 8).moveTo(8, -4).lineTo(12, 8)
  hoof.stroke({ width: 2, color: JADE, alpha: 0.7 })
  hoof.position.set(from.x, from.y + from.h * 0.2)
  hoof.alpha = 0
  addTemp('back', hoof)
  tl.to(hoof, { alpha: 1, duration: 0.12 }, 0.16)
  const ox = drawOx()
  ox.position.set(from.x, from.y - 8)
  ox.alpha = 0
  ox.scale.set(0.4)
  addTemp('front', ox)
  tl.to(ox, { alpha: 0.92, duration: 0.22 }, 0.28)
  tl.to(ox.scale, { x: 1, y: 1, duration: 0.28, ease: 'back.out(1.4)' }, 0.28)
  tl.add(() => {
    shakeCamera(12, 0.28)
    sparks(from, JADE, 10, 36)
    ring(from, BRONZE, 14, 90, 0.4)
    ctx.onImpact()
    document.querySelectorAll(`.lane-cards .battle-card.${ctx.side}`).forEach((card, i) => {
      const r = card.getBoundingClientRect()
      const line = new Graphics()
      line.moveTo(from.x, from.y).lineTo(r.left + r.width / 2, r.top + r.height / 2)
      line.stroke({ width: 1.4, color: BRONZE, alpha: 0.45 })
      addTemp('back', line)
      fadeKill(line, 0.4, 0.08 + i * 0.04)
    })
  }, 0.58)
  tl.add(() => {
    fadeKill(ox, 0.35)
    fadeKill(ink, 0.3)
    fadeKill(hoof, 0.3)
    fadeKill(veil, 0.3)
  }, 0.95)
  tl.to({}, { duration: 0.28 })
}

function drawOx(): Graphics {
  const g = new Graphics()
  g.ellipse(0, 10, 36, 22).fill({ color: 0x1c1812, alpha: 0.92 })
  g.ellipse(0, -8, 22, 18).fill({ color: 0x2a2418, alpha: 0.95 })
  g.moveTo(-18, -12).lineTo(-34, -36).lineTo(-8, -16).stroke({ width: 5, color: 0x1a1610 })
  g.moveTo(18, -12).lineTo(34, -36).lineTo(8, -16).stroke({ width: 5, color: 0x1a1610 })
  g.moveTo(-18, -12).lineTo(-34, -36).stroke({ width: 2, color: JADE, alpha: 0.85 })
  g.moveTo(18, -12).lineTo(34, -36).stroke({ width: 2, color: JADE, alpha: 0.85 })
  g.circle(0, -10, 5).stroke({ width: 1.6, color: 0xefd27a })
  g.circle(-18, 28, 5).fill({ color: JADE, alpha: 0.45 })
  g.circle(18, 28, 5).fill({ color: JADE, alpha: 0.45 })
  return g
}

export function playStaggerHit(uid: string): void {
  const at = cardPoint(uid)
  if (!at) return
  swayCard(uid)
  const ghost = new Graphics()
  ghost.ellipse(0, 0, at.w * 0.28, at.h * 0.34).fill({ color: AMBER, alpha: 0.18 })
  ghost.position.set(at.x - 10, at.y)
  addTemp('front', ghost)
  gsap.to(ghost, { x: at.x - 22, alpha: 0, duration: 0.28, onComplete: () => ghost.destroy() })
  const ghost2 = new Graphics()
  ghost2.ellipse(0, 0, at.w * 0.26, at.h * 0.32).fill({ color: 0xd4b45a, alpha: 0.14 })
  ghost2.position.set(at.x + 8, at.y)
  addTemp('front', ghost2)
  gsap.to(ghost2, { x: at.x + 20, alpha: 0, duration: 0.28, onComplete: () => ghost2.destroy() })
  for (let i = 0; i < 3; i++) {
    const drop = new Graphics()
    drop.ellipse(0, 0, 3.2, 4.4).fill({ color: BLOOD_AMBER })
    drop.position.set(at.x + (i - 1) * 10, at.y - 18)
    addTemp('front', drop)
    gsap.to(drop, {
      y: at.y + 16,
      alpha: 0,
      duration: 0.28,
      delay: i * 0.05,
      onComplete: () => drop.destroy(),
    })
  }
  const ripple = new Graphics()
  ripple.ellipse(0, 0, 16, 7).stroke({ width: 2, color: AMBER, alpha: 0.7 })
  ripple.position.set(at.x, at.y + at.h * 0.36)
  ripple.rotation = -0.2
  addTemp('back', ripple)
  fadeKill(ripple, 0.3)
}

export function playOxShare(fromUid: string, toUid: string): void {
  const from = cardPoint(fromUid)
  const to = cardPoint(toUid)
  if (!from || !to) return
  const line = new Graphics()
  line.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 2.2, color: 0x5a3a22, alpha: 0.7 })
  addTemp('back', line)
  fadeKill(line, 0.32)
  const blob = new Graphics()
  blob.circle(0, 0, 7).fill({ color: 0x6a2018, alpha: 0.9 })
  blob.position.set(from.x, from.y)
  addTemp('front', blob)
  gsap.to(blob, {
    x: to.x,
    y: to.y,
    duration: 0.22,
    ease: 'power2.in',
    onComplete: () => {
      blob.destroy()
      ring(to, BRONZE, 8, 40, 0.24)
      punchCard(toUid, 'heavy')
    },
  })
}
