import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardArtUrl, cardEl, cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const GOLD = 0xffe08a
const HOLY = 0xfff4c2
const CHAMPAGNE = 0xf2d37a
const MINT = 0x9ee8c2
const LILAC = 0xc8b4ff
const IVORY = 0xf7f1de

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

function sparkRing(at: Point, color: number, from = 6, to = 36): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, from).stroke({ width: 2.2, color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration: 0.24, ease: 'power2.out' })
  fadeKill(g, 0.24)
}

function sunWheel(at: Point, r: number, spikes = 8): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, r * 0.38).stroke({ width: 2.4, color: GOLD, alpha: 0.9 })
  g.circle(0, 0, r * 0.2).fill({ color: HOLY, alpha: 0.55 })
  for (let i = 0; i < spikes; i++) {
    const a = (Math.PI * 2 * i) / spikes
    g.moveTo(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28)
      .lineTo(Math.cos(a) * r, Math.sin(a) * r)
      .stroke({ width: 2.2, color: i % 2 ? HOLY : CHAMPAGNE, cap: 'round', alpha: 0.85 })
  }
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function lotus(at: Point, r = 16): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 0, r, r * 0.45).stroke({ width: 2, color: GOLD, alpha: 0.85 })
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2
    g.ellipse(Math.cos(a) * 8, Math.sin(a) * 4, 5, 9).fill({ color: HOLY, alpha: 0.35 })
  }
  g.position.set(at.x, at.y + 18)
  add('back', g)
  return g
}

function mote(at: Point, color: number, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const g = new Graphics()
    g.blendMode = 'add'
    g.circle(0, 0, 1.2 + Math.random() * 1.8).fill({ color, alpha: 0.95 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 10,
      alpha: 0,
      duration: 0.32,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 6).fill({ color: GOLD, alpha: 0.95 })
  g.circle(-2, -2, 2.4).fill({ color: HOLY, alpha: 0.9 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      sparkRing({ x: g.x, y: g.y, w: 8, h: 8 }, HOLY, 4, 16)
      g.destroy()
    },
  })
}

function ribbon(from: Point, to: Point, color: number): void {
  const mid = {
    x: (from.x + to.x) / 2 + (to.x > from.x ? -18 : 18),
    y: Math.min(from.y, to.y) - 28,
  }
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(from.x, from.y).lineTo(mid.x, mid.y).lineTo(to.x, to.y).stroke({
    width: 7,
    color,
    cap: 'round',
    join: 'round',
    alpha: 0.72,
  })
  g.moveTo(from.x, from.y).lineTo(mid.x, mid.y).lineTo(to.x, to.y).stroke({
    width: 2.4,
    color: HOLY,
    cap: 'round',
    join: 'round',
    alpha: 0.95,
  })
  add('front', g)
  fadeKill(g, 0.28, 0.06)
}

function spear(from: Point, to: Point): void {
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  const len = Math.hypot(to.x - from.x, to.y - from.y) + 28
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(-len / 2, 0).lineTo(len / 2, 0).stroke({ width: 7, color: CHAMPAGNE, cap: 'round', alpha: 0.7 })
  g.moveTo(-len / 2, 0).lineTo(len / 2, 0).stroke({ width: 3.2, color: HOLY, cap: 'round', alpha: 0.95 })
  g.moveTo(len / 2 - 10, -5).lineTo(len / 2 + 8, 0).lineTo(len / 2 - 10, 5).fill({ color: IVORY, alpha: 0.95 })
  g.position.set((from.x + to.x) / 2, (from.y + to.y) / 2)
  g.rotation = ang
  add('front', g)
  fadeKill(g, 0.18, 0.04)
}

function insertQueueGhost(uid: string): void {
  const src = cardEl(uid)
  const dest = document.querySelector<HTMLElement>('.atk-queue .queue-track')
  const url = cardArtUrl(uid)
  if (!src || !dest) return
  const a = src.getBoundingClientRect()
  const b = dest.getBoundingClientRect()
  const ghost = document.createElement('div')
  ghost.className = 'queue-ghost'
  if (url) ghost.innerHTML = `<img src="${url}" alt="" />`
  ghost.style.left = `${a.left + a.width / 2 - 18}px`
  ghost.style.top = `${a.top + 8}px`
  document.body.appendChild(ghost)
  gsap.to(ghost, {
    left: b.left + 4,
    top: b.top + 8,
    duration: 0.32,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.to(ghost, { opacity: 0, duration: 0.22, delay: 0.18, onComplete: () => ghost.remove() })
    },
  })
}

function smite(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  tl.add(() => {
    liftCard(ctx.actorUid, -8, 0.1)
    const wheel = sunWheel({ x: from.x, y: from.y - 8, w: 20, h: 20 }, 22, 8)
    fadeKill(wheel, 0.28, 0.12)
    mote(from, GOLD, 6, 18)
  }, 0)
  tl.add(() => {
    lotus(to, 12)
    spear({ x: to.x + 46, y: to.y - 110, w: 8, h: 8 }, to)
  }, 0.14)
  tl.add(() => {
    const burst = sunWheel(to, 26, 8)
    fadeKill(burst, 0.22)
    sparkRing(to, GOLD, 8, 34)
    mote(to, HOLY, 8, 22)
    punchCard(uid, 'light')
    shakeCamera(2, 0.1)
    ctx.onImpact()
  }, 0.28)
  tl.add(() => {
    pearlToSp(to, ctx.side)
    settleCard(ctx.actorUid)
  }, 0.4)
  hold(tl, 0.62)
  return tl
}

function flashHeal(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const pad = lotus(to, 14)
  tl.add(() => {
    liftCard(ctx.actorUid, -6, 0.1)
    const half = sunWheel({ x: from.x, y: from.y - 6, w: 16, h: 16 }, 16, 4)
    fadeKill(half, 0.22, 0.08)
  }, 0)
  tl.add(() => {
    ribbon(from, to, GOLD)
    mote(from, MINT, 5, 14)
  }, 0.14)
  tl.add(() => {
    gsap.to(pad.scale, { x: 1.6, y: 1.8, duration: 0.22, ease: 'power2.out' })
    fadeKill(pad, 0.28)
    sparkRing(to, MINT, 8, 32)
    mote(to, HOLY, 7, 18)
    punchCard(uid, 'light')
    ctx.onImpact()
    settleCard(ctx.actorUid)
  }, 0.3)
  hold(tl, 0.62)
  return tl
}

function powerInfusion(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  tl.add(() => {
    liftCard(ctx.actorUid, -8, 0.12)
    ;[GOLD, LILAC].forEach((color, i) => {
      const g = new Graphics()
      g.blendMode = 'add'
      g.circle(0, 0, 6).fill({ color, alpha: 0.95 })
      g.position.set(from.x + (i ? 12 : -12), from.y + 20)
      add('front', g)
      gsap.to(g, {
        x: to.x,
        y: to.y - 28,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => g.destroy(),
      })
    })
  }, 0)
  tl.add(() => {
    const crown = sunWheel({ x: to.x, y: to.y - 36, w: 24, h: 24 }, 24, 8)
    gsap.to(crown, { y: to.y - 18, duration: 0.2, ease: 'power2.out' })
    fadeKill(crown, 0.36, 0.18)
    lotus(to, 16)
    stamp('能量灌注', '#f3e0a8', 36)
    liftCard(uid, -10, 0.16)
  }, 0.22)
  tl.add(() => {
    sparkRing(to, LILAC, 10, 40)
    mote(to, GOLD, 10, 24)
    punchCard(uid, 'light')
    insertQueueGhost(uid)
    ctx.onImpact()
  }, 0.44)
  tl.add(() => {
    settleCard(ctx.actorUid)
    settleCard(uid)
  }, 0.7)
  hold(tl, 0.92)
  return tl
}

function hymn(ctx: FxContext, from: Point, hits: { uid: string; pt: Point }[]): gsap.core.Timeline {
  const tl = gsap.timeline()
  const foes = [...document.querySelectorAll<HTMLElement>('.battle-card.ai')]
    .map((el) => el.dataset.uid)
    .filter((uid): uid is string => Boolean(uid))
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x120e08, alpha: 0.12 })
  overlayLayer?.addChild(veil)
  tl.add(() => {
    for (const uid of foes) dimCard(uid, true)
    liftCard(ctx.actorUid, -12, 0.18)
    gsap.to('.battle-center', { scale: 0.98, duration: 0.2 })
  }, 0)
  const wheel = { node: null as Graphics | null }
  tl.add(() => {
    wheel.node = sunWheel({ x: from.x, y: from.y - 12, w: 40, h: 40 }, 52, 8)
    gsap.to(wheel.node, { rotation: 0.45, duration: 1.1, ease: 'none' })
    mote(from, GOLD, 12, 28)
  }, 0.18)
  tl.add(() => {
    for (const hit of hits) {
      ribbon(from, hit.pt, CHAMPAGNE)
      lotus(hit.pt, 14)
    }
  }, 0.42)
  tl.add(() => {
    for (const hit of hits) {
      const beam = new Graphics()
      beam.blendMode = 'add'
      beam.rect(-7, -90, 14, 110).fill({ color: HOLY, alpha: 0.28 })
      beam.rect(-2.5, -90, 5, 110).fill({ color: GOLD, alpha: 0.55 })
      beam.position.set(hit.pt.x, hit.pt.y)
      add('front', beam)
      fadeKill(beam, 0.32, 0.08)
    }
  }, 0.58)
  tl.add(() => {
    sparkRing(from, GOLD, 16, 90)
    for (const hit of hits) {
      mote(hit.pt, MINT, 6, 16)
      punchCard(hit.uid, 'light')
    }
    gsap.to('.battle-center', { scale: 1, duration: 0.2 })
    ctx.onImpact()
  }, 0.82)
  tl.add(() => {
    if (wheel.node) fadeKill(wheel.node, 0.32)
    fadeKill(veil, 0.28)
    settleCard(ctx.actorUid)
    for (const uid of foes) dimCard(uid, false)
  }, 1.12)
  hold(tl, 1.4)
  return tl
}

export function playPriestFx(ctx: FxContext): gsap.core.Timeline {
  const from = cardPoint(ctx.actorUid)
  const hits = hitList(ctx)
  const to = hits[0]?.pt ?? (ctx.targetUid ? cardPoint(ctx.targetUid) : from)
  const fail = gsap.timeline()
  fail.timeScale(ctx.timeScale)
  if (!from) {
    fail.add(() => ctx.onImpact())
    return fail
  }

  const tl =
    ctx.skillId === 'aa' && to && hits[0]
      ? smite(ctx, from, to, hits[0].uid)
      : ctx.skillId === 's1' && to && hits[0]
        ? flashHeal(ctx, from, to, hits[0].uid)
        : ctx.skillId === 's2' && to && (hits[0] || ctx.targetUid)
          ? powerInfusion(ctx, from, to, hits[0]?.uid ?? ctx.targetUid!)
          : ctx.skillId === 's3'
            ? hymn(ctx, from, hits)
            : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}

export function playPowerInfusionFx(ctx: FxContext): gsap.core.Timeline {
  return playPriestFx(ctx)
}
