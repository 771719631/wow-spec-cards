import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const LEAF = 0x79c96b
const EMERALD = 0x2e9b70
const MOON = 0x8ecde3
const DEW = 0x9fe7d1
const GOLD = 0xe8c878
const IVORY = 0xf7f1de
const PETAL = 0xe8b5b7
const FOREST = 0x173d32

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

function hitList(ctx: FxContext): { uid: string; pt: Point }[] {
  const ids = ctx.targetUids?.length ? ctx.targetUids : ctx.targetUid ? [ctx.targetUid] : []
  return ids
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))
}

function allyHits(ctx: FxContext): { uid: string; pt: Point }[] {
  const hits = hitList(ctx).filter((h) => h.uid !== ctx.actorUid || hitList(ctx).length === 1)
  if (hits.length) return hits
  return [...document.querySelectorAll<HTMLElement>(`.battle-card.${ctx.side}:not(.is-dead)`)]
    .map((el) => el.dataset.uid)
    .filter((uid): uid is string => Boolean(uid))
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))
}

function stamp(text: string, color: string, size = 34): HTMLElement {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  el.style.fontSize = `${size}px`
  el.style.textShadow = '0 0 14px #0b1a12, 0 0 18px #2e9b70'
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.24,
    delay: 0.38,
    onComplete: () => el.remove(),
  })
  return el
}

function leaf(at: Point, size = 8, color = LEAF, rot = 0): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 0, size, size * 0.42).fill({ color, alpha: 0.9 })
  g.moveTo(-size * 0.15, 0).lineTo(size * 0.7, 0).stroke({ width: 1.2, color: IVORY, alpha: 0.7 })
  g.position.set(at.x, at.y)
  g.rotation = rot
  add('front', g)
  return g
}

function seed(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 2 * scale, 5 * scale, 7 * scale).fill({ color: EMERALD, alpha: 0.9 })
  g.circle(0, -1 * scale, 3.2 * scale).fill({ color: GOLD, alpha: 0.95 })
  g.circle(-1.2 * scale, -2 * scale, 1.2 * scale).fill({ color: IVORY, alpha: 0.85 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function ring(at: Point, color: number, from = 8, to = 36, duration = 0.24, width = 2.2): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, from).stroke({ width, color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration, ease: 'power2.out' })
  fadeKill(g, duration)
}

function mote(at: Point, color: number, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const g = new Graphics()
    g.blendMode = 'add'
    g.circle(0, 0, 1.1 + Math.random() * 1.8).fill({ color, alpha: 0.95 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 10,
      alpha: 0,
      duration: 0.3 + Math.random() * 0.1,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function vine(from: Point, to: Point, color = EMERALD): Graphics {
  const mid = {
    x: (from.x + to.x) / 2 + (to.x > from.x ? -22 : 22),
    y: Math.min(from.y, to.y) - 36,
  }
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(from.x, from.y).quadraticCurveTo(mid.x, mid.y, to.x, to.y).stroke({
    width: 5,
    color,
    cap: 'round',
    alpha: 0.55,
  })
  g.moveTo(from.x, from.y).quadraticCurveTo(mid.x, mid.y, to.x, to.y).stroke({
    width: 1.8,
    color: DEW,
    cap: 'round',
    alpha: 0.9,
  })
  add('front', g)
  return g
}

function yearRing(at: Point, r = 22): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, r).stroke({ width: 2, color: EMERALD, alpha: 0.7 })
  g.circle(0, 0, r * 0.62).stroke({ width: 1.4, color: GOLD, alpha: 0.45 })
  g.circle(0, 0, r * 0.28).stroke({ width: 1.2, color: LEAF, alpha: 0.7 })
  g.position.set(at.x, at.y + at.h * 0.38)
  add('back', g)
  return g
}

function sprouts(at: Point): void {
  for (let i = 0; i < 5; i++) {
    const g = new Graphics()
    g.blendMode = 'add'
    const dx = (i - 2) * 8
    g.moveTo(0, 8).lineTo(0, -10).stroke({ width: 1.6, color: LEAF, cap: 'round', alpha: 0.9 })
    g.ellipse(-4, -6, 5, 2.4).fill({ color: LEAF, alpha: 0.8 })
    g.ellipse(4, -6, 5, 2.4).fill({ color: EMERALD, alpha: 0.8 })
    g.position.set(at.x + dx, at.y + at.h * 0.42)
    add('back', g)
    gsap.fromTo(g, { alpha: 0, y: g.y + 8 }, { alpha: 1, y: g.y, duration: 0.16 })
    fadeKill(g, 0.32, 0.18)
  }
}

function leafWheel(at: Point, r = 22): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, r * 0.22).fill({ color: IVORY, alpha: 0.8 })
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6
    g.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.16)
      .fill({ color: i % 2 ? LEAF : GOLD, alpha: 0.72 })
  }
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = seed({ x: from.x, y: from.y, w: 8, h: 8 }, 1.1)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, LEAF, 4, 16, 0.18, 2)
      g.destroy()
    },
  })
}

function wrath(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const orb = new Graphics()
  orb.blendMode = 'add'
  orb.circle(0, 0, 9).fill({ color: IVORY, alpha: 0.95 })
  orb.circle(0, 0, 14).fill({ color: GOLD, alpha: 0.45 })
  orb.circle(0, 0, 18).stroke({ width: 2, color: LEAF, alpha: 0.9 })
  orb.position.set(from.x, from.y - 10)
  add('front', orb)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.1)
    const rings = yearRing(from, 18)
    fadeKill(rings, 0.32, 0.08)
    mote(from, LEAF, 6, 16)
    gsap.to(orb.scale, { x: 1.15, y: 1.15, duration: 0.12 })
  }, 0)
  tl.add(() => {
    const trail = vine(from, to, LEAF)
    fadeKill(trail, 0.2, 0.08)
    gsap.to(orb, { x: to.x, y: to.y, duration: 0.16, ease: 'power2.in' })
    for (let i = 0; i < 4; i++) {
      const flake = leaf(from, 6, i % 2 ? LEAF : GOLD, Math.random())
      gsap.to(flake, {
        x: to.x + (Math.random() - 0.5) * 18,
        y: to.y + (Math.random() - 0.5) * 18,
        rotation: Math.random() * 2,
        duration: 0.18,
        ease: 'power1.in',
        onComplete: () => flake.destroy(),
      })
    }
  }, 0.14)
  tl.add(() => {
    fadeKill(orb, 0.08)
    const wheel = leafWheel(to, 24)
    gsap.to(wheel, { rotation: 0.8, duration: 0.18 })
    fadeKill(wheel, 0.22)
    ring(to, GOLD, 8, 34, 0.18, 2)
    mote(to, LEAF, 8, 20)
    punchCard(uid, 'light')
    shakeCamera(2.5, 0.1)
    ctx.onImpact()
  }, 0.32)
  tl.add(() => {
    pearlToSp(to, ctx.side)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.44)
  hold(tl, 0.62)
  return tl
}

function rejuvenation(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const pod = seed({ x: from.x, y: from.y - 8, w: 8, h: 8 }, 1.2)
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -6, 0.1)
    yearRing(from, 16)
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 * i) / 3 - Math.PI / 2
      const flake = leaf(
        { x: from.x + Math.cos(a) * 16, y: from.y - 8 + Math.sin(a) * 10, w: 8, h: 8 },
        7,
        i ? LEAF : GOLD,
        a,
      )
      gsap.to(flake, { x: to.x, y: to.y, duration: 0.28, delay: i * 0.03, ease: 'power2.inOut' })
      fadeKill(flake, 0.16, 0.26)
    }
  }, 0)
  tl.add(() => {
    const band = vine(from, to)
    fadeKill(band, 0.22, 0.08)
    gsap.to(pod, { x: to.x, y: to.y, duration: 0.16, ease: 'power2.in' })
    mote({ x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 20, w: 8, h: 8 }, PETAL, 5, 14)
  }, 0.16)
  tl.add(() => {
    fadeKill(pod, 0.1)
    sprouts(to)
    ring({ x: to.x, y: to.y + to.h * 0.38, w: 8, h: 8 }, LEAF, 8, 28, 0.22, 2)
    mote(to, DEW, 7, 16)
    punchCard(uid, 'light')
    ctx.onImpact()
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.36)
  hold(tl, 0.7)
  return tl
}

function innervate(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const wisp = new Graphics()
  wisp.blendMode = 'add'
  wisp.ellipse(0, 0, 7, 10).fill({ color: MOON, alpha: 0.85 })
  wisp.ellipse(-8, 2, 7, 3).fill({ color: DEW, alpha: 0.55 })
  wisp.ellipse(8, 2, 7, 3).fill({ color: DEW, alpha: 0.55 })
  wisp.circle(0, -2, 3).fill({ color: IVORY, alpha: 0.95 })
  wisp.position.set(from.x + 16, from.y)
  add('front', wisp)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    gsap.to(wisp, { x: from.x - 18, y: from.y - 18, duration: 0.18, ease: 'sine.inOut' })
  }, 0)
  tl.add(() => {
    const band = vine(from, to, MOON)
    fadeKill(band, 0.2, 0.08)
    gsap.to(wisp, { x: to.x, y: to.y - 8, duration: 0.2, ease: 'power2.in' })
  }, 0.2)
  tl.add(() => {
    fadeKill(wisp, 0.12)
    const rune = new Graphics()
    rune.blendMode = 'add'
    rune.arc(0, 4, 16, Math.PI * 1.15, Math.PI * 1.85).stroke({ width: 2.4, color: MOON, alpha: 0.95 })
    rune.ellipse(0, -2, 8, 4).fill({ color: EMERALD, alpha: 0.7 })
    rune.position.set(to.x, to.y + to.h * 0.34)
    add('back', rune)
    fadeKill(rune, 0.4, 0.12)
    ring(to, MOON, 8, 32, 0.22, 2)
    mote(to, DEW, 8, 18)
    stamp('激活', '#8ecde3', 32)
    punchCard(uid, 'light')
    ctx.onImpact()
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.42)
  hold(tl, 0.76)
  return tl
}

function tranquility(ctx: FxContext, from: Point, hits: { uid: string; pt: Point }[]): gsap.core.Timeline {
  const tl = gsap.timeline()
  const foes = [...document.querySelectorAll<HTMLElement>('.battle-card:not(.is-dead)')]
    .map((el) => el.dataset.uid)
    .filter((uid): uid is string => Boolean(uid) && uid !== ctx.actorUid && !hits.some((h) => h.uid === uid))
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: FOREST, alpha: 0.16 })
  overlayLayer?.addChild(veil)

  const tree = new Graphics()
  tree.blendMode = 'add'
  tree.roundRect(-10, -8, 20, 70, 6).fill({ color: EMERALD, alpha: 0.28 })
  tree.circle(0, -28, 42).fill({ color: LEAF, alpha: 0.22 })
  tree.circle(-22, -18, 22).fill({ color: EMERALD, alpha: 0.18 })
  tree.circle(24, -16, 20).fill({ color: GOLD, alpha: 0.12 })
  tree.circle(0, -48, 16).stroke({ width: 2, color: MOON, alpha: 0.7 })
  tree.position.set(from.x, from.y - 8)
  add('back', tree)
  tree.alpha = 0

  tl.add(() => {
    for (const uid of foes) dimCard(uid, true)
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -10, 0.16)
    gsap.to('.battle-center', { scale: 0.98, duration: 0.2 })
    yearRing(from, 26)
  }, 0)
  tl.add(() => {
    gsap.to(tree, { alpha: 0.95, duration: 0.22 })
    for (const hit of hits) {
      const root = vine({ x: from.x, y: from.y + 30, w: 8, h: 8 }, { ...hit.pt, y: hit.pt.y + hit.pt.h * 0.4 })
      fadeKill(root, 0.9, 0.2)
    }
  }, 0.22)

  const waves: Array<{ color: number; extra: () => void }> = [
    {
      color: LEAF,
      extra: () => {
        for (const hit of hits) sprouts(hit.pt)
      },
    },
    {
      color: DEW,
      extra: () => {
        for (const hit of hits) mote({ ...hit.pt, y: hit.pt.y - 18 }, MOON, 6, 14)
      },
    },
    {
      color: GOLD,
      extra: () => {
        ring(from, GOLD, 18, 88, 0.32, 3)
        mote(from, PETAL, 10, 28)
      },
    },
  ]

  waves.forEach((wave, i) => {
    tl.add(() => {
      if (i === 0) ctx.onImpact()
      wave.extra()
      for (const hit of hits) {
        ring({ x: hit.pt.x, y: hit.pt.y + hit.pt.h * 0.2, w: 8, h: 8 }, wave.color, 8, 30, 0.2, 2)
        punchCard(hit.uid, 'light')
      }
    }, 0.52 + i * 0.22)
  })

  tl.add(() => {
    fadeKill(tree, 0.28)
    fadeKill(veil, 0.28)
    gsap.to('.battle-center', { scale: 1, duration: 0.2 })
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    for (const uid of foes) dimCard(uid, false)
  }, 1.22)
  hold(tl, 1.42)
  return tl
}

export function playRestoFx(ctx: FxContext): gsap.core.Timeline {
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
      ? wrath(ctx, from, to, hits[0].uid)
      : ctx.skillId === 's1' && to && hits[0]
        ? rejuvenation(ctx, from, to, hits[0].uid)
        : ctx.skillId === 's2' && to && (hits[0] || ctx.targetUid)
          ? innervate(ctx, from, to, hits[0]?.uid ?? ctx.targetUid!)
          : ctx.skillId === 's3'
            ? tranquility(ctx, from, allyHits(ctx))
            : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
