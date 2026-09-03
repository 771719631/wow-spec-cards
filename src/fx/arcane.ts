import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const ARCANE = 0x7b4ddb
const ROYAL = 0x355fd6
const CYAN = 0x55d6e8
const MAGENTA = 0xd04cd8
const WHITE = 0xf4f1ff
const SILVER = 0xb8ceff

const VOLLEY_TINT = [ROYAL, SILVER, MAGENTA, CYAN]
const PATHS = [
  { mx: 0, my: 0 },
  { mx: -30, my: 6 },
  { mx: 30, my: 6 },
  { mx: 10, my: -44 },
  { mx: -8, my: 22 },
]

function add(layer: 'back' | 'front' | 'overlay', node: Graphics): void {
  const host = layer === 'back' ? backLayer : layer === 'overlay' ? overlayLayer : frontLayer
  host?.addChild(node)
}

function fadeKill(node: Graphics, duration: number, delay = 0): void {
  gsap.to(node, {
    alpha: 0,
    duration,
    delay,
    ease: 'power2.out',
    onComplete: () => node.destroy(),
  })
}

function hold(tl: gsap.core.Timeline, t: number): void {
  tl.to({}, { duration: 0.01 }, t)
}

function stamp(text: string, color: string, size = 34): void {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  el.style.fontSize = `${size}px`
  el.style.textShadow = '0 0 14px #000, 0 0 16px #7b4ddb'
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    delay: 0.36,
    onComplete: () => el.remove(),
  })
}

function hex(g: Graphics, r: number): Graphics {
  const pts: number[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6
    pts.push(Math.cos(a) * r, Math.sin(a) * r)
  }
  return g.poly(pts)
}

function ring(at: Point, color: number, from = 8, to = 36, duration = 0.2, width = 2): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, from).stroke({ width, color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration, ease: 'power2.out' })
  fadeKill(g, duration)
}

function shards(at: Point, color: number, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const g = new Graphics()
    g.blendMode = 'add'
    hex(g, 2.2 + Math.random() * 1.8).fill({ color, alpha: 0.95 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.35
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 8,
      rotation: ang,
      alpha: 0,
      duration: 0.28 + Math.random() * 0.08,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function sigil(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  hex(g, 22 * scale).stroke({ width: 1.6, color: ARCANE, alpha: 0.85 })
  hex(g, 14 * scale).stroke({ width: 1.2, color: ROYAL, alpha: 0.8 })
  g.circle(0, 0, 4 * scale).fill({ color: WHITE, alpha: 0.7 })
  g.position.set(at.x, at.y + 22)
  add('back', g)
  return g
}

function reticle(at: Point, faint = false): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 18).stroke({ width: 1.4, color: faint ? SILVER : CYAN, alpha: faint ? 0.45 : 0.9 })
  hex(g, 10).stroke({ width: 1.2, color: ARCANE, alpha: faint ? 0.4 : 0.85 })
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
    g.circle(Math.cos(a) * 16, Math.sin(a) * 16, 2).fill({
      color: faint ? SILVER : WHITE,
      alpha: faint ? 0.45 : 0.95,
    })
  }
  g.position.set(at.x, at.y + 20)
  add('back', g)
  return g
}

function crystal(at: Point, color: number, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.poly([0, -11 * scale, 7 * scale, 4 * scale, 0, 9 * scale, -7 * scale, 4 * scale]).fill({
    color,
    alpha: 0.28,
  })
  g.poly([0, -11 * scale, 7 * scale, 4 * scale, 0, 9 * scale, -7 * scale, 4 * scale]).stroke({
    width: 1.4,
    color: SILVER,
    alpha: 0.95,
  })
  g.circle(0, -2 * scale, 2 * scale).fill({ color: WHITE, alpha: 0.85 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function prismLens(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.poly([0, -20 * scale, 16 * scale, 12 * scale, -16 * scale, 12 * scale]).fill({ color: CYAN, alpha: 0.16 })
  g.poly([0, -20 * scale, 16 * scale, 12 * scale, -16 * scale, 12 * scale]).stroke({
    width: 1.8,
    color: SILVER,
    alpha: 0.95,
  })
  g.moveTo(0, -16 * scale)
    .lineTo(10 * scale, 8 * scale)
    .stroke({ width: 1.1, color: MAGENTA, alpha: 0.7 })
  g.moveTo(0, -16 * scale)
    .lineTo(-10 * scale, 8 * scale)
    .stroke({ width: 1.1, color: ROYAL, alpha: 0.7 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function bolt(color: number): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(11, 0).lineTo(-7, 5).lineTo(-4, 0).lineTo(-7, -5).closePath().fill({ color, alpha: 0.95 })
  g.circle(5, 0, 3.2).fill({ color: WHITE, alpha: 0.95 })
  g.circle(0, 0, 9).stroke({ width: 1.1, color, alpha: 0.45 })
  return g
}

function flyBolt(
  from: Point,
  to: Point,
  delay: number,
  color: number,
  path: (typeof PATHS)[number],
  onHit?: () => void,
): void {
  const g = bolt(color)
  g.position.set(from.x, from.y)
  g.rotation = Math.atan2(to.y - from.y, to.x - from.x)
  add('front', g)
  const midX = (from.x + to.x) / 2 + path.mx
  const midY = Math.min(from.y, to.y) + path.my - 10
  gsap.to(g, { x: midX, y: midY, duration: 0.06, delay, ease: 'power1.out' })
  gsap.to(g, {
    x: to.x,
    y: to.y,
    duration: 0.12,
    delay: delay + 0.06,
    ease: 'power2.in',
    onComplete: () => {
      g.destroy()
      onHit?.()
    },
  })
}

function hexHit(at: Point, color: number): void {
  const g = new Graphics()
  g.blendMode = 'add'
  hex(g, 8).stroke({ width: 2, color, alpha: 0.95 })
  hex(g, 4).fill({ color: WHITE, alpha: 0.7 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: 2.2, y: 2.2, duration: 0.16, ease: 'power2.out' })
  fadeKill(g, 0.16)
  ring(at, color, 6, 26, 0.18, 1.6)
  shards(at, color, 3, 14)
}

function crystalToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = crystal(from, ARCANE, 0.85)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.28,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, SILVER, 4, 14, 0.16, 1.6)
      g.destroy()
    },
  })
}

function crystalToCaster(from: Point, to: Point, color: number, delay = 0): void {
  const g = crystal(from, color, 0.9)
  gsap.to(g, {
    x: to.x + 18,
    y: to.y - 16,
    duration: 0.28,
    delay,
    ease: 'power2.inOut',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, color, 4, 16, 0.16, 1.4)
      fadeKill(g, 0.18)
    },
  })
}

function extraPoints(ctx: FxContext): Point[] {
  return (ctx.extraUids ?? [])
    .map((uid) => cardPoint(uid))
    .filter((pt): pt is Point => Boolean(pt))
}

function missiles(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const extras = extraPoints(ctx)
  const marks = [reticle(to), ...extras.map((pt) => reticle(pt, true))]
  const floor = sigil(from)
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    gsap.to(floor, { rotation: Math.PI / 3, duration: 0.7, ease: 'sine.inOut' })
  }, 0)
  tl.add(() => {
    extras.forEach((_, i) => {
      const lens = prismLens(
        { x: from.x + (i % 2 ? 36 : -36), y: from.y - 28 - i * 8, w: 8, h: 8 },
        0.7,
      )
      gsap.to(lens, { y: lens.y - 6, duration: 0.2, yoyo: true, repeat: 1 })
      fadeKill(lens, 0.7, 0.18)
    })
  }, 0.08)
  const fireAt = 0.24
  for (let i = 0; i < 5; i++) {
    const t = fireAt + i * 0.07
    tl.add(() => {
      flyBolt(from, to, 0, VOLLEY_TINT[0], PATHS[i], () => {
        hexHit(to, VOLLEY_TINT[0])
        punchCard(uid, i === 4 ? 'heavy' : 'light')
        if (i === 0) ctx.onImpact()
        if (i === 4) {
          crystalToSp(to, ctx.side)
          shakeCamera(3, 0.1)
        }
      })
    }, t)
  }
  extras.forEach((pt, volley) => {
    const extraUid = ctx.extraUids?.[volley]
    const tint = VOLLEY_TINT[(volley + 1) % VOLLEY_TINT.length]
    const muzzle: Point = {
      x: from.x + (volley % 2 ? 34 : -34),
      y: from.y - 30 - volley * 10,
      w: 8,
      h: 8,
    }
    for (let i = 0; i < 5; i++) {
      tl.add(() => {
        flyBolt(muzzle, pt, 0, tint, PATHS[i], () => {
          hexHit(pt, tint)
          if (extraUid) punchCard(extraUid, 'light')
        })
      }, fireAt + 0.12 + volley * 0.1 + i * 0.07)
    }
  })
  const last = fireAt + 0.12 + Math.max(0, extras.length - 1) * 0.1 + 4 * 0.07 + 0.22
  tl.add(() => {
    marks.forEach((m) => fadeKill(m, 0.18))
    fadeKill(floor, 0.2)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, Math.max(0.82, last))
  hold(tl, Math.max(0.95, last + 0.12))
  return tl
}

function prismatic(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const lenses: Graphics[] = []
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    stamp('棱彩飞弹', '#55d6e8', 32)
    const floor = sigil(from, 1.05)
    fadeKill(floor, 0.7, 0.2)
  }, 0)
  tl.add(() => {
    for (let i = 0; i < 3; i++) {
      const t = i / 3
      const lens = prismLens(
        {
          x: from.x + (to.x - from.x) * (0.22 + t * 0.22),
          y: from.y + (to.y - from.y) * (0.22 + t * 0.22),
          w: 8,
          h: 8,
        },
        1 - i * 0.18,
      )
      lens.rotation = (i - 1) * 0.18
      lenses.push(lens)
    }
  }, 0.12)
  tl.add(() => {
    const core = new Graphics()
    core.blendMode = 'add'
    core.circle(0, 0, 7).fill({ color: ARCANE, alpha: 0.95 })
    core.circle(0, 0, 3).fill({ color: WHITE, alpha: 0.95 })
    core.position.set(from.x, from.y)
    add('front', core)
    gsap.to(core, {
      x: to.x,
      y: to.y,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => core.destroy(),
    })
  }, 0.34)
  tl.add(() => {
    ctx.onImpact()
    const burst = new Graphics()
    burst.blendMode = 'add'
    hex(burst, 12).fill({ color: WHITE, alpha: 0.55 })
    hex(burst, 18).stroke({ width: 2.2, color: MAGENTA, alpha: 0.9 })
    hex(burst, 26).stroke({ width: 1.4, color: CYAN, alpha: 0.8 })
    burst.position.set(to.x, to.y)
    add('overlay', burst)
    gsap.to(burst.scale, { x: 1.6, y: 1.6, duration: 0.12, yoyo: true, repeat: 1 })
    fadeKill(burst, 0.28)
    shards(to, CYAN, 8, 22)
    shards(to, MAGENTA, 6, 18)
    ring(to, ARCANE, 10, 42, 0.24, 2)
    punchCard(uid, 'heavy')
    shakeCamera(6, 0.16)
    crystalToCaster(to, from, CYAN)
    lenses.forEach((lens) => fadeKill(lens, 0.18))
  }, 0.56)
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.86)
  hold(tl, 0.98)
  return tl
}

function touchMagi(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const mark = new Graphics()
  mark.blendMode = 'add'
  hex(mark, 28).stroke({ width: 1.8, color: MAGENTA, alpha: 0.85 })
  hex(mark, 18).stroke({ width: 1.4, color: ARCANE, alpha: 0.9 })
  mark.circle(0, 0, 6).fill({ color: MAGENTA, alpha: 0.7 })
  mark.circle(0, 0, 2.4).fill({ color: WHITE, alpha: 0.95 })
  mark.position.set(to.x, to.y)
  add('back', mark)
  const beam = new Graphics()
  beam.blendMode = 'add'
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy)
  beam.moveTo(0, 0).lineTo(len, 0).stroke({ width: 1.6, color: SILVER, alpha: 0.7 })
  beam.position.set(from.x, from.y)
  beam.rotation = Math.atan2(dy, dx)
  add('front', beam)
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    stamp('大法师之触', '#d04cd8', 34)
    gsap.to(mark, { rotation: Math.PI / 2, duration: 0.7, ease: 'sine.inOut' })
  }, 0)
  tl.add(() => {
    ctx.onImpact()
    hexHit(to, MAGENTA)
    punchCard(uid, 'heavy')
    shakeCamera(5, 0.14)
    crystalToCaster(to, from, ARCANE, 0)
    crystalToCaster({ x: to.x + 10, y: to.y - 8, w: 8, h: 8 }, from, ROYAL, 0.06)
  }, 0.32)
  tl.add(() => {
    fadeKill(beam, 0.18)
    fadeKill(mark, 0.28)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.62)
  hold(tl, 0.78)
  return tl
}

export function playArcaneFx(ctx: FxContext): gsap.core.Timeline {
  const from = cardPoint(ctx.actorUid)
  const to = ctx.targetUid ? cardPoint(ctx.targetUid) : null
  const fail = gsap.timeline()
  fail.timeScale(ctx.timeScale)
  if (!from) {
    fail.add(() => ctx.onImpact())
    return fail
  }
  const tl =
    ctx.skillId === 'aa' && to && ctx.targetUid
      ? missiles(ctx, from, to, ctx.targetUid)
      : ctx.skillId === 's1' && to && ctx.targetUid
        ? prismatic(ctx, from, to, ctx.targetUid)
        : ctx.skillId === 's3' && to && ctx.targetUid
          ? touchMagi(ctx, from, to, ctx.targetUid)
          : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
