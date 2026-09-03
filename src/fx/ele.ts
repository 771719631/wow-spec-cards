import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardEl, cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const ICE = 0x7ecbff
const CORE = 0xf5fbff
const VIOLET = 0xb48cff
const EARTH = 0xc9a46a
const ROCK = 0x8a6a3a
const FIRE = 0xff6a1a
const GOLD = 0xffe08a
const MAGMA = 0xff4d12

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

function stamp(text: string, color: string, size = 36): void {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  el.style.fontSize = `${size}px`
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    delay: 0.38,
    onComplete: () => el.remove(),
  })
}

function mark(uid: string, cls: string, on: boolean): void {
  cardEl(uid)?.classList.toggle(cls, on)
}

function hitList(ctx: FxContext): { uid: string; pt: Point }[] {
  const ids = ctx.targetUids?.length
    ? ctx.targetUids
    : ctx.targetUid
      ? [ctx.targetUid]
      : []
  return ids
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))
}

function chainOrder(hits: { uid: string; pt: Point }[]): { uid: string; pt: Point }[] {
  if (hits.length <= 1) return hits.slice()
  const cx = hits.reduce((s, h) => s + h.pt.x, 0) / hits.length
  const first = hits.slice().sort((a, b) => Math.abs(a.pt.x - cx) - Math.abs(b.pt.x - cx))[0]
  const left = hits.filter((h) => h.uid !== first.uid && h.pt.x < first.pt.x).sort((a, b) => b.pt.x - a.pt.x)
  const right = hits.filter((h) => h.uid !== first.uid && h.pt.x >= first.pt.x).sort((a, b) => a.pt.x - b.pt.x)
  const out = [first]
  let i = 0
  let j = 0
  while (i < left.length || j < right.length) {
    if (i < left.length) out.push(left[i++])
    if (j < right.length) out.push(right[j++])
  }
  return out
}

function jagged(from: Point, to: Point, steps: number, amp: number): { x: number; y: number }[] {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const pts = [{ x: from.x, y: from.y }]
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const jitter = (Math.random() - 0.5) * amp
    pts.push({ x: from.x + dx * t + nx * jitter, y: from.y + dy * t + ny * jitter })
  }
  pts.push({ x: to.x, y: to.y })
  return pts
}

function strokePoly(pts: { x: number; y: number }[], width: number, color: number, alpha: number): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
  g.stroke({ width, color, cap: 'round', join: 'round', alpha })
  add('front', g)
  return g
}

function bolt(from: Point, to: Point, width: number, main: boolean): void {
  const pts = jagged(from, to, main ? 8 : 6, main ? 28 : 16)
  fadeKill(strokePoly(pts, width + 3.2, ICE, 0.7), 0.2, 0.04)
  fadeKill(strokePoly(pts, width, CORE, 0.95), 0.18, 0.03)
  if (main) fadeKill(strokePoly(pts, 1.3, VIOLET, 0.55), 0.16, 0.02)
}

function sparkRing(at: Point, color: number, from = 6, to = 36): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, from).stroke({ width: 2.4, color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration: 0.22, ease: 'power2.out' })
  fadeKill(g, 0.22)
}

function microArcs(at: Point, count = 6): void {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.3
    const r = 16 + Math.random() * 12
    const g = new Graphics()
    g.blendMode = 'add'
    g.moveTo(Math.cos(ang) * 8, Math.sin(ang) * 8)
      .lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
      .stroke({ width: 1.4, color: i % 2 ? CORE : ICE, cap: 'round', alpha: 0.9 })
    g.position.set(at.x, at.y)
    add('front', g)
    fadeKill(g, 0.16, Math.random() * 0.08)
  }
}

function orb(at: Point, color: number, r: number): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, r).fill({ color, alpha: 0.95 })
  g.circle(-r * 0.3, -r * 0.25, r * 0.4).fill({ color: CORE, alpha: 0.8 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function fireball(from: Point, to: Point, delay: number, big: boolean): void {
  const r = big ? 12 : 7
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, r).fill({ color: FIRE, alpha: 0.95 })
  g.circle(-r * 0.28, -r * 0.2, r * 0.42).fill({ color: GOLD, alpha: 0.92 })
  if (big) g.circle(0, 0, r + 3.5).stroke({ width: 2.2, color: ICE, alpha: 0.7 })
  g.position.set(from.x, from.y)
  add('front', g)
  const lift = big ? 40 : 24
  const midX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 18
  const midY = Math.min(from.y, to.y) - lift
  gsap.to(g, {
    x: midX,
    y: midY,
    duration: 0.14,
    delay,
    ease: 'power1.out',
  })
  gsap.to(g, {
    x: to.x,
    y: to.y,
    duration: big ? 0.28 : 0.22,
    delay: delay + 0.14,
    ease: 'power2.in',
    onComplete: () => {
      const burst = new Graphics()
      burst.blendMode = 'add'
      burst.circle(0, 0, big ? 14 : 9).fill({ color: MAGMA, alpha: 0.9 })
      burst.position.set(to.x, to.y)
      add('front', burst)
      gsap.to(burst.scale, { x: big ? 2.8 : 2.2, y: big ? 2.8 : 2.2, duration: 0.22, ease: 'power2.out' })
      fadeKill(burst, 0.22)
      if (big) sparkRing(to, ICE, 10, 48)
      g.destroy()
    },
  })
}

function dimStage(alpha: number, duration: number): Graphics {
  const g = new Graphics()
  g.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x07060a, alpha })
  add('overlay', g)
  fadeKill(g, duration, 0.12)
  return g
}

function rootsFlash(at: Point, hot = false): void {
  const g = new Graphics()
  g.blendMode = 'add'
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI * 2 * i) / 6
    g.moveTo(0, 0)
      .lineTo(Math.cos(ang) * 30, Math.sin(ang) * 14)
      .stroke({ width: hot ? 2.6 : 2, color: hot ? MAGMA : EARTH, alpha: 0.9 })
  }
  g.position.set(at.x, at.y + 20)
  add('back', g)
  fadeKill(g, hot ? 0.28 : 0.12)
}

function arrayBox(hits: { uid: string; pt: Point }[]): { cx: number; cy: number; rx: number; ry: number } | null {
  if (!hits.length) return null
  const xs = hits.map((h) => h.pt.x)
  const ys = hits.map((h) => h.pt.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const cy = ys.reduce((s, y) => s + y, 0) / ys.length + 20
  return { cx: (minX + maxX) / 2, cy, rx: Math.max(70, (maxX - minX) / 2 + 48), ry: 22 }
}

function warningSigil(hits: { uid: string; pt: Point }[]): Graphics | null {
  const box = arrayBox(hits)
  if (!box) return null
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 0, box.rx, box.ry).stroke({ width: 3, color: EARTH, alpha: 0.92 })
  g.ellipse(0, 0, box.rx * 0.62, box.ry * 0.55).stroke({ width: 1.6, color: GOLD, alpha: 0.7 })
  for (let i = 0; i < 8; i++) {
    const t = (Math.PI * 2 * i) / 8
    g.moveTo(Math.cos(t) * box.rx * 0.7, Math.sin(t) * box.ry * 0.7)
      .lineTo(Math.cos(t) * box.rx * 0.92, Math.sin(t) * box.ry * 0.92)
      .stroke({ width: 1.4, color: ROCK, alpha: 0.8 })
  }
  g.position.set(box.cx, box.cy)
  add('back', g)
  return g
}

function cracks(hits: { uid: string; pt: Point }[], color: number, reach: number): void {
  const box = arrayBox(hits)
  if (!box) return
  const g = new Graphics()
  g.blendMode = 'add'
  for (const hit of hits) {
    g.moveTo(box.cx, box.cy)
      .lineTo(hit.pt.x, hit.pt.y + 18)
      .stroke({ width: 1.8, color, alpha: 0.8 })
    g.moveTo(hit.pt.x - reach, hit.pt.y + 18)
      .lineTo(hit.pt.x + reach, hit.pt.y + 18)
      .stroke({ width: 1.3, color, alpha: 0.7 })
  }
  add('back', g)
  fadeKill(g, 0.36)
}

function rocks(hits: { uid: string; pt: Point }[], count: number, lift: number, size = 8): void {
  for (const hit of hits) {
    for (let i = 0; i < count; i++) {
      const bit = new Graphics()
      const s = size * (0.7 + Math.random() * 0.6)
      bit.roundRect(-s / 2, -s / 3, s, s * 0.7, 1).fill({ color: i % 2 ? ROCK : EARTH })
      bit.position.set(hit.pt.x + (Math.random() - 0.5) * 18, hit.pt.y + 16)
      add('front', bit)
      gsap.to(bit, {
        y: bit.y - lift - Math.random() * 10,
        x: bit.x + (Math.random() - 0.5) * 24,
        rotation: Math.random() * 2,
        alpha: 0,
        duration: 0.34,
        ease: 'power2.out',
        onComplete: () => bit.destroy(),
      })
    }
  }
}

function dustRing(hits: { uid: string; pt: Point }[], scale: number): void {
  const box = arrayBox(hits)
  if (!box) return
  const g = new Graphics()
  g.ellipse(0, 0, 36, 14).stroke({ width: 4, color: EARTH, alpha: 0.45 })
  g.position.set(box.cx, box.cy)
  add('back', g)
  gsap.to(g.scale, { x: scale, y: scale * 0.55, duration: 0.3, ease: 'power2.out' })
  fadeKill(g, 0.3)
}

function spirit(at: Point): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.roundRect(-18, -34, 36, 54, 10).fill({ color: MAGMA, alpha: 0.5 })
  g.roundRect(-24, -16, 16, 42, 8).fill({ color: ICE, alpha: 0.42 })
  g.roundRect(8, -16, 16, 42, 8).fill({ color: ICE, alpha: 0.42 })
  g.roundRect(-26, -8, 12, 16, 3).fill({ color: ROCK, alpha: 0.55 })
  g.roundRect(14, -8, 12, 16, 3).fill({ color: ROCK, alpha: 0.55 })
  g.circle(0, -28, 11).fill({ color: GOLD, alpha: 0.88 })
  g.circle(-4, -30, 2.2).fill({ color: CORE, alpha: 1 })
  g.circle(4, -30, 2.2).fill({ color: CORE, alpha: 1 })
  g.circle(0, 0, 36).stroke({ width: 3, color: FIRE, alpha: 0.72 })
  g.circle(0, 0, 46).stroke({ width: 2, color: ICE, alpha: 0.55 })
  g.position.set(at.x, at.y - 14)
  add('front', g)
  return g
}

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = orb(from, ICE, 6)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.28,
    ease: 'power2.in',
    onComplete: () => {
      sparkRing({ x: g.x, y: g.y, w: 8, h: 8 }, CORE, 4, 18)
      g.destroy()
    },
  })
}

function missRoots(uid: string, at: Point): void {
  mark(uid, 'is-root-flash', true)
  rootsFlash(at, false)
  window.setTimeout(() => mark(uid, 'is-root-flash', false), 110)
}

function rootedProc(
  from: Point,
  hits: { uid: string; pt: Point }[],
  tl: gsap.core.Timeline,
  at: number,
  fromGround: boolean,
): void {
  tl.add(() => {
    rootsFlash(from, true)
    stamp('根深蒂固', '#e8a23a', 28)
  }, at)
  hits.forEach((hit, i) => {
    const origin = fromGround
      ? { x: hit.pt.x + (Math.random() - 0.5) * 10, y: hit.pt.y + 18, w: 8, h: 8 }
      : from
    tl.add(() => fireball(origin, hit.pt, 0, false), at + 0.12 + i * 0.04)
    tl.add(() => punchCard(hit.uid, 'light'), at + 0.42 + i * 0.04)
  })
}

export function playEleFx(ctx: FxContext): gsap.core.Timeline {
  const tl = gsap.timeline()
  tl.timeScale(ctx.timeScale)
  const from = cardPoint(ctx.actorUid)
  const hits = hitList(ctx)
  if (!from) {
    tl.add(() => ctx.onImpact())
    return tl
  }

  if (ctx.skillId === 'aa') {
    const order = chainOrder(hits)
    tl.add(() => {
      liftCard(ctx.actorUid, -10, 0.12)
      const ball = orb({ x: from.x, y: from.y - 18, w: 12, h: 12 }, ICE, 8)
      fadeKill(ball, 0.18, 0.1)
      sparkRing(from, ICE, 8, 28)
      microArcs(from, 7)
      for (const hit of order) mark(hit.uid, 'is-chain-mark', true)
    }, 0)
    tl.add(() => {
      const first = order[0]
      if (first) {
        bolt(from, first.pt, 5.4, true)
        punchCard(first.uid, 'heavy')
        sparkRing(first.pt, CORE, 8, 32)
        mark(first.uid, 'is-chain-mark', false)
      }
      shakeCamera(4, 0.16)
      ctx.onImpact()
    }, 0.15)
    order.slice(1).forEach((hit, i) => {
      const prev = order[i]
      tl.add(() => {
        bolt(prev.pt, hit.pt, 3.4, false)
        punchCard(hit.uid, 'light')
        sparkRing(hit.pt, ICE, 6, 24)
        mark(hit.uid, 'is-chain-mark', false)
      }, 0.22 + i * 0.05)
    })
    const lastJump = order.length > 1 ? 0.22 + (order.length - 2) * 0.05 : 0.15
    const pearlAt = lastJump + 0.08
    tl.add(() => {
      shakeCamera(3, 0.12)
      pearlToSp(order[order.length - 1]?.pt ?? from, ctx.side)
      settleCard(ctx.actorUid)
      for (const hit of order) mark(hit.uid, 'is-chain-mark', false)
    }, pearlAt)
    if (ctx.procAscend) {
      rootedProc(from, hits, tl, pearlAt + 0.12, false)
      hold(tl, pearlAt + 0.78)
    } else {
      tl.add(() => missRoots(ctx.actorUid, from), pearlAt + 0.06)
      hold(tl, pearlAt + 0.32)
    }
    return tl
  }

  if (ctx.skillId === 's2') {
    const sigil = { node: null as Graphics | null }
    tl.add(() => {
      sigil.node = warningSigil(hits)
      for (const hit of hits) mark(hit.uid, 'is-quake-warn', true)
      rocks(hits, 1, 6, 5)
    }, 0)
    tl.add(() => {
      cracks(hits, EARTH, 16)
      rocks(hits, 2, 12, 7)
      dustRing(hits, 2.4)
      for (const hit of hits) punchCard(hit.uid, 'light')
      shakeCamera(4, 0.16)
      ctx.onImpact()
    }, 0.24)
    tl.add(() => {
      cracks(hits, ROCK, 22)
      rocks(hits, 3, 18, 9)
      dustRing(hits, 3.2)
      for (const hit of hits) punchCard(hit.uid, 'heavy')
      shakeCamera(7, 0.18)
    }, 0.44)
    tl.add(() => {
      cracks(hits, GOLD, 30)
      rocks(hits, 5, 28, 12)
      dustRing(hits, 4.4)
      for (const hit of hits) {
        mark(hit.uid, 'is-quake-warn', false)
        punchCard(hit.uid, 'crit')
      }
      shakeCamera(11, 0.22)
      if (sigil.node) fadeKill(sigil.node, 0.35)
    }, 0.64)
    if (ctx.procAscend) {
      tl.add(() => cracks(hits, MAGMA, 26), 0.82)
      rootedProc(from, hits, tl, 0.86, true)
      hold(tl, 1.52)
    } else {
      tl.add(() => missRoots(ctx.actorUid, from), 0.86)
      hold(tl, 1.12)
    }
    return tl
  }

  if (ctx.skillId === 's3') {
    const others = [...document.querySelectorAll<HTMLElement>('[data-uid]')]
      .map((el) => el.dataset.uid)
      .filter((uid): uid is string => Boolean(uid) && uid !== ctx.actorUid)
    dimStage(0.22, 1.05)
    tl.add(() => {
      for (const uid of others) dimCard(uid, true)
      liftCard(ctx.actorUid, -16, 0.2)
      ;[ICE, EARTH, FIRE].forEach((color, i) => {
        const start = {
          x: from.x + (i - 1) * 36,
          y: from.y + 48,
          w: 8,
          h: 8,
        }
        const ball = orb(start, color, 6)
        gsap.to(ball, {
          x: from.x,
          y: from.y - 8,
          duration: 0.22,
          ease: 'power2.in',
          onComplete: () => ball.destroy(),
        })
      })
      sparkRing(from, ICE, 10, 36)
      sparkRing(from, FIRE, 8, 42)
    }, 0)
    const ghost = { node: null as Graphics | null }
    tl.add(() => {
      ghost.node = spirit(from)
      stamp('升腾', '#ffb24a', 48)
      gsap.to(ghost.node.scale, { x: 1.08, y: 1.08, duration: 0.28, yoyo: true, repeat: 1 })
    }, 0.22)
    const fans = hits.map((hit, i) => ({
      hit,
      spawn: {
        x: from.x + (i - (hits.length - 1) / 2) * 22,
        y: from.y - 46,
        w: 12,
        h: 12,
      },
    }))
    tl.add(() => {
      for (const fan of fans) {
        const seed = orb(fan.spawn, FIRE, 9)
        seed.circle(0, 0, 12).stroke({ width: 1.6, color: ICE, alpha: 0.7 })
        fadeKill(seed, 0.18, 0.08)
      }
    }, 0.52)
    tl.add(() => {
      fans.forEach((fan, i) => fireball(fan.spawn, fan.hit.pt, i * 0.03, true))
      shakeCamera(6, 0.18)
    }, 0.72)
    tl.add(() => {
      ctx.onImpact()
      hits.forEach((hit) => punchCard(hit.uid, 'crit'))
      shakeCamera(8, 0.22)
    }, 1.08)
    tl.add(() => {
      if (ghost.node) fadeKill(ghost.node, 0.32)
      settleCard(ctx.actorUid)
      for (const uid of others) dimCard(uid, false)
    }, 1.28)
    hold(tl, 1.52)
    return tl
  }

  tl.add(() => {
    rootsFlash(from, true)
    ctx.onImpact()
  }, 0.08)
  hold(tl, 0.22)
  return tl
}
