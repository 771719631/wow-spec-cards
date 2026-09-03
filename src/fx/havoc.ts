import gsap from 'gsap'
import { Graphics, Sprite, Texture } from 'pixi.js'
import { cardArtUrl, cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const FEL = 0x68f542
const CORE = 0xd6ff78
const DEMON = 0x7b35d1
const VOID = 0x261638
const BLADE = 0xdceaf5
const FLAME = 0x16131e
const SOUL = 0x58d9a0

function add(layer: 'back' | 'front' | 'overlay', node: Graphics | Sprite): void {
  const host = layer === 'back' ? backLayer : layer === 'overlay' ? overlayLayer : frontLayer
  host?.addChild(node)
}

function fadeKill(node: Graphics | Sprite, duration: number, delay = 0): void {
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
  el.style.textShadow = '0 0 14px #000, 0 0 16px #68f542, 0 0 10px #7b35d1'
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    delay: 0.38,
    onComplete: () => el.remove(),
  })
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
      y: at.y + Math.sin(ang) * spread - 8,
      alpha: 0,
      duration: 0.26 + Math.random() * 0.1,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function ghost(from: Point, url: string | null, tint = DEMON): Sprite | null {
  if (!url) return null
  const sprite = new Sprite(Texture.from(url))
  sprite.anchor.set(0.5)
  sprite.width = from.w * 1.08
  sprite.height = from.h * 1.08
  sprite.alpha = 0.48
  sprite.tint = tint
  sprite.position.set(from.x, from.y)
  add('front', sprite)
  return sprite
}

function dashGhost(from: Point, to: Point, url: string | null, duration: number, tint = DEMON): void {
  const sprite = ghost(from, url, tint)
  if (!sprite) return
  gsap.to(sprite, {
    x: to.x,
    y: to.y,
    alpha: 0.12,
    duration,
    ease: 'power3.in',
  })
  fadeKill(sprite, 0.12, duration - 0.06)
}

function glaiveSlash(at: Point, angle: number, wide = false): void {
  const g = new Graphics()
  g.blendMode = 'add'
  const w = wide ? 10 : 5.2
  const len = wide ? 62 : 52
  g.moveTo(-len, -5).lineTo(len + 4, 7).stroke({
    width: w + 7,
    color: DEMON,
    cap: 'round',
    alpha: 0.32,
  })
  g.moveTo(-len + 2, -2).lineTo(len + 2, 4).stroke({
    width: w + 2,
    color: FEL,
    cap: 'round',
    alpha: 0.88,
  })
  g.moveTo(-len + 4, 0).lineTo(len, 2).stroke({
    width: w * 0.42,
    color: wide ? CORE : BLADE,
    cap: 'round',
    alpha: 0.95,
  })
  g.position.set(at.x, at.y)
  g.rotation = angle
  add('front', g)
  gsap.to(g, { rotation: angle + 0.12, duration: 0.14, ease: 'power2.out' })
  fadeKill(g, 0.2)
}

function crescent(at: Point, angle: number, radius: number, color: number): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.arc(0, 0, radius, -0.85, 0.85).stroke({ width: 4.2, color, cap: 'round', alpha: 0.9 })
  g.arc(0, 0, radius + 5, -0.7, 0.7).stroke({ width: 1.6, color: CORE, cap: 'round', alpha: 0.55 })
  g.position.set(at.x, at.y)
  g.rotation = angle
  add('front', g)
  gsap.to(g, { rotation: angle + 0.9, duration: 0.22, ease: 'power2.out' })
  fadeKill(g, 0.22)
}

function triRune(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  const s = scale
  g.moveTo(0, -18 * s)
    .lineTo(16 * s, 12 * s)
    .lineTo(-16 * s, 12 * s)
    .closePath()
    .stroke({ width: 1.6, color: FEL, alpha: 0.9 })
  g.moveTo(0, -10 * s)
    .lineTo(9 * s, 7 * s)
    .lineTo(-9 * s, 7 * s)
    .closePath()
    .stroke({ width: 1.1, color: DEMON, alpha: 0.8 })
  g.circle(0, 2 * s, 3.2 * s).fill({ color: CORE, alpha: 0.75 })
  g.position.set(at.x, at.y + 20)
  add('back', g)
  return g
}

function felEye(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  const s = scale
  g.ellipse(0, 0, 16 * s, 8 * s).stroke({ width: 1.8, color: FEL, alpha: 0.95 })
  g.ellipse(0, 0, 5.5 * s, 5.5 * s).fill({ color: CORE, alpha: 0.95 })
  g.circle(0, 0, 2.1 * s).fill({ color: FLAME, alpha: 0.95 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function wings(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  const s = scale
  g.moveTo(0, 0)
    .quadraticCurveTo(-42 * s, -28 * s, -78 * s, 10 * s)
    .quadraticCurveTo(-36 * s, 16 * s, 0, 8 * s)
    .fill({ color: DEMON, alpha: 0.42 })
  g.moveTo(0, 0)
    .quadraticCurveTo(42 * s, -28 * s, 78 * s, 10 * s)
    .quadraticCurveTo(36 * s, 16 * s, 0, 8 * s)
    .fill({ color: DEMON, alpha: 0.42 })
  g.moveTo(-18 * s, -4 * s)
    .quadraticCurveTo(-50 * s, -22 * s, -70 * s, 4 * s)
    .stroke({ width: 1.6, color: FEL, alpha: 0.55 })
  g.moveTo(18 * s, -4 * s)
    .quadraticCurveTo(50 * s, -22 * s, 70 * s, 4 * s)
    .stroke({ width: 1.6, color: FEL, alpha: 0.55 })
  g.position.set(at.x, at.y)
  add('back', g)
  return g
}

function shard(at: Point, color: number, r = 5): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(0, -r)
    .lineTo(r * 0.7, 0)
    .lineTo(0, r)
    .lineTo(-r * 0.7, 0)
    .closePath()
    .fill({ color, alpha: 0.95 })
  g.circle(0, 0, r * 0.35).fill({ color: CORE, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function soulToSp(from: Point, side: FxContext['side'], big = false): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = shard(from, big ? FEL : SOUL, big ? 8 : 5)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.28,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, FEL, 4, big ? 18 : 14, 0.16, 2)
      g.destroy()
    },
  })
}

function shardToOrb(from: Point, skillId: string, color: number): void {
  const host = document.querySelector<HTMLElement>(`.skill-orb[data-skill="${skillId}"]`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = shard(from, color, 5)
  gsap.to(g, {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, color, 4, 16, 0.16, 2)
      g.destroy()
    },
  })
}

function foeHits(ctx: FxContext): { uid: string; pt: Point }[] {
  const foe = ctx.side === 'player' ? 'ai' : 'player'
  const ids = (ctx.targetUids ?? []).filter((id) => id !== ctx.actorUid)
  const source = ids.length
    ? ids
    : [...document.querySelectorAll<HTMLElement>(`.battle-card.${foe}:not(.is-dead)`)]
        .map((el) => el.dataset.uid)
        .filter((uid): uid is string => Boolean(uid))
  return source
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))
}

function pierceLine(hits: { pt: Point }[], yOff: number, color: number, width: number): void {
  if (!hits.length) return
  const xs = hits.map((h) => h.pt.x)
  const ys = hits.map((h) => h.pt.y)
  const minX = Math.min(...xs) - 48
  const maxX = Math.max(...xs) + 48
  const y = ys.reduce((a, b) => a + b, 0) / ys.length + yOff
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(minX, y).lineTo(maxX, y).stroke({ width: width + 6, color: DEMON, cap: 'round', alpha: 0.28 })
  g.moveTo(minX, y).lineTo(maxX, y).stroke({ width, color, cap: 'round', alpha: 0.92 })
  g.moveTo(minX, y).lineTo(maxX, y).stroke({ width: width * 0.35, color: BLADE, cap: 'round', alpha: 0.9 })
  add('front', g)
  fadeKill(g, 0.2)
}

function flashFel(alpha = 0.32): void {
  const g = new Graphics()
  g.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: CORE, alpha })
  overlayLayer?.addChild(g)
  fadeKill(g, 0.08)
}

function beam(from: Point, to: Point, width: number, pulse: boolean): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  const left = { x: from.x - 8, y: from.y - 6 }
  const right = { x: from.x + 8, y: from.y - 6 }
  g.moveTo(left.x, left.y).lineTo(to.x, to.y).stroke({
    width: width + 4,
    color: DEMON,
    cap: 'round',
    alpha: 0.28,
  })
  g.moveTo(right.x, right.y).lineTo(to.x, to.y).stroke({
    width: width + 4,
    color: DEMON,
    cap: 'round',
    alpha: 0.28,
  })
  g.moveTo(left.x, left.y).lineTo(to.x, to.y).stroke({
    width,
    color: FEL,
    cap: 'round',
    alpha: 0.92,
  })
  g.moveTo(right.x, right.y).lineTo(to.x, to.y).stroke({
    width,
    color: FEL,
    cap: 'round',
    alpha: 0.92,
  })
  if (pulse) {
    g.moveTo(from.x, from.y - 6).lineTo(to.x, to.y).stroke({
      width: width * 0.45,
      color: CORE,
      cap: 'round',
      alpha: 0.95,
    })
  }
  add('front', g)
  return g
}

function drainStream(from: Point, to: Point): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 3.4).fill({ color: SOUL, alpha: 0.95 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, { x: to.x, y: to.y, duration: 0.22, ease: 'power2.in' })
  fadeKill(g, 0.08, 0.2)
}

function crackle(at: Point): void {
  const g = new Graphics()
  g.blendMode = 'add'
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI * 2 * i) / 3 - Math.PI / 2
    g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8)
      .lineTo(Math.cos(a) * 22, Math.sin(a) * 22)
      .stroke({ width: 1.4, color: FEL, cap: 'round', alpha: 0.75 })
  }
  g.position.set(at.x, at.y + 22)
  add('back', g)
  fadeKill(g, 0.28)
}

function huntMark(at: Point): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 16).stroke({ width: 1.4, color: DEMON, alpha: 0.7 })
  g.moveTo(-10, -6).lineTo(10, 6).stroke({ width: 1.5, color: FEL, alpha: 0.85 })
  g.moveTo(-10, 6).lineTo(10, -6).stroke({ width: 1.5, color: FEL, alpha: 0.85 })
  g.arc(0, 0, 20, -0.4, Math.PI - 0.4).stroke({ width: 1.2, color: FEL, alpha: 0.55 })
  g.position.set(at.x, at.y + 22)
  add('back', g)
  return g
}

function stunMark(at: Point): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 10).stroke({ width: 1.6, color: DEMON, alpha: 0.9 })
  for (let i = 0; i < 3; i++) {
    const a = (Math.PI * 2 * i) / 3 - Math.PI / 2
    g.circle(Math.cos(a) * 14, Math.sin(a) * 14, 3).fill({ color: DEMON, alpha: 0.95 })
  }
  g.position.set(at.x, at.y - 28)
  add('front', g)
  gsap.to(g, { rotation: Math.PI * 1.4, duration: 0.7, ease: 'none' })
  fadeKill(g, 0.22, 0.55)
}

function chaosStrike(ctx: FxContext, from: Point, to: Point, uid: string, meta: boolean): gsap.core.Timeline {
  const tl = gsap.timeline()
  const url = cardArtUrl(ctx.actorUid)
  const mark = huntMark(to)
  const shade = ghost(from, url, DEMON)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.1)
    const dash = new Graphics()
    dash.blendMode = 'add'
    dash.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 1.4, color: FEL, alpha: 0.35 })
    add('back', dash)
    fadeKill(dash, 0.16)
    if (shade) gsap.to(shade, { x: from.x - 10, y: from.y + 4, duration: 0.1 })
  }, 0)

  tl.add(() => {
    dashGhost({ x: to.x - 42, y: to.y + 10, w: from.w, h: from.h }, to, url, 0.12)
    glaiveSlash(to, -0.72, meta)
    mote(to, FEL, meta ? 8 : 5, 14)
    punchCard(uid, 'light')
    ctx.onImpact()
    if (meta) {
      const wing = wings({ x: to.x - 28, y: to.y, w: 8, h: 8 }, 0.55)
      fadeKill(wing, 0.2)
      crackle(to)
    }
  }, 0.2)

  tl.add(() => {
    dashGhost({ x: to.x + 40, y: to.y - 8, w: from.w, h: from.h }, to, url, 0.12, meta ? FEL : DEMON)
    glaiveSlash(to, 0.72, meta)
    const xmark = new Graphics()
    xmark.blendMode = 'add'
    xmark.moveTo(-28, -22).lineTo(30, 24).stroke({ width: meta ? 4 : 2.4, color: FEL, cap: 'round', alpha: 0.9 })
    xmark.moveTo(-28, 24).lineTo(30, -22).stroke({ width: meta ? 4 : 2.4, color: CORE, cap: 'round', alpha: 0.9 })
    xmark.position.set(to.x, to.y)
    add('front', xmark)
    fadeKill(xmark, 0.22)
    mote(to, CORE, meta ? 10 : 6, 18)
    punchCard(uid, meta ? 'heavy' : 'light')
    shakeCamera(meta ? 8 : 5, 0.14)
    if (meta) {
      const eye = felEye(to, 1.15)
      gsap.to(eye.scale, { x: 1.4, y: 1.4, duration: 0.16 })
      fadeKill(eye, 0.18)
    }
  }, 0.32)

  tl.add(() => {
    if (meta) {
      const a = shard({ x: to.x - 14, y: to.y, w: 8, h: 8 }, SOUL, 5)
      const b = shard({ x: to.x + 14, y: to.y, w: 8, h: 8 }, FEL, 5)
      gsap.to(a, { x: to.x, y: to.y, duration: 0.12, ease: 'power2.in', onComplete: () => a.destroy() })
      gsap.to(b, { x: to.x, y: to.y, duration: 0.12, ease: 'power2.in', onComplete: () => b.destroy() })
    }
  }, 0.42)

  tl.add(() => {
    soulToSp(to, ctx.side, meta)
    fadeKill(mark, 0.16)
    if (shade) fadeKill(shade, 0.16)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    stamp(meta ? '毁灭' : '混乱打击', meta ? '#d6ff78' : '#68f542', meta ? 36 : 30)
  }, 0.52)

  hold(tl, meta ? 0.78 : 0.68)
  return tl
}

function bladeDance(ctx: FxContext, from: Point, meta: boolean): gsap.core.Timeline {
  const tl = gsap.timeline()
  const hits = foeHits(ctx)
  const url = cardArtUrl(ctx.actorUid)
  const boxXs = hits.map((h) => h.pt.x)
  const boxYs = hits.map((h) => h.pt.y)
  const cx = boxXs.length ? (Math.min(...boxXs) + Math.max(...boxXs)) / 2 : from.x
  const cy = boxYs.length ? boxYs.reduce((a, b) => a + b, 0) / boxYs.length : from.y
  const center: Point = { x: cx, y: cy, w: 8, h: 8 }

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.1)
    shardToOrb(from, 's1', SOUL)
    shardToOrb({ x: from.x + 12, y: from.y - 8, w: 8, h: 8 }, 's1', FEL)
    for (const hit of hits) {
      const rune = triRune(hit.pt, 0.7)
      fadeKill(rune, 0.5, 0.2)
    }
  }, 0)

  tl.add(() => {
    dashGhost(from, { x: (hits[0]?.pt.x ?? cx) - 40, y: cy, w: from.w, h: from.h }, url, 0.14)
    pierceLine(hits, 0, FEL, meta ? 8 : 5)
    if (meta) {
      const w = wings({ x: cx, y: cy - 8, w: 8, h: 8 }, 0.85)
      fadeKill(w, 0.22)
    }
    for (const hit of hits) {
      punchCard(hit.uid, 'light')
      mote(hit.pt, FEL, 4, 10)
    }
    ctx.onImpact()
  }, 0.28)

  tl.add(() => {
    crescent(center, -0.4, 42, DEMON)
    crescent(center, Math.PI - 0.4, 42, FEL)
    if (meta) {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4
        const clone = ghost(
          { x: cx + Math.cos(a) * 46, y: cy + Math.sin(a) * 28, w: from.w * 0.7, h: from.h * 0.7 },
          url,
          DEMON,
        )
        if (clone) {
          clone.alpha = 0.38
          fadeKill(clone, 0.22)
        }
      }
    }
    for (const hit of hits) punchCard(hit.uid, 'light')
    shakeCamera(4, 0.12)
  }, 0.42)

  tl.add(() => {
    dashGhost({ x: cx, y: cy - 70, w: from.w, h: from.h }, center, url, 0.14, FEL)
    ring(center, FEL, 12, meta ? 78 : 54, 0.24, meta ? 4 : 2.4)
    const ringGlaive = new Graphics()
    ringGlaive.blendMode = 'add'
    ringGlaive.circle(0, 0, 28).stroke({ width: 3.2, color: CORE, alpha: 0.85 })
    ringGlaive.position.set(cx, cy)
    add('front', ringGlaive)
    gsap.to(ringGlaive.scale, { x: meta ? 2.6 : 1.9, y: meta ? 2.6 : 1.9, duration: 0.22, ease: 'power2.out' })
    fadeKill(ringGlaive, 0.22)
    for (const hit of hits) {
      punchCard(hit.uid, meta ? 'heavy' : 'light')
      crackle(hit.pt)
    }
    shakeCamera(meta ? 11 : 7, 0.16)
    stamp(meta ? '死亡横扫' : '刃舞', meta ? '#d6ff78' : '#c8b4ff', meta ? 36 : 30)
  }, 0.56)

  tl.add(() => {
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.88)

  hold(tl, meta ? 1.18 : 1.02)
  return tl
}

function eyeBeam(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const mark = felEye({ x: to.x, y: to.y, w: 8, h: 8 }, 0.85)
  const rune = triRune(to, 1.05)
  let ray: Graphics | null = null

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -6, 0.1)
    shardToOrb(from, 's2', SOUL)
    shardToOrb({ x: from.x - 10, y: from.y - 6, w: 8, h: 8 }, 's2', FEL)
    gsap.to('.battle-center', { scale: 1.03, duration: 0.2 })
    if (ctx.metaForm) {
      const eye = felEye({ x: from.x, y: from.y - 28, w: 8, h: 8 }, 1.2)
      fadeKill(eye, 0.9, 0.1)
    }
  }, 0)

  tl.add(() => {
    ray = beam(from, to, 2.2, false)
    mote(from, FEL, 6, 10)
  }, 0.28)

  const pulse = (width: number, last: boolean, at: number): void => {
    tl.add(() => {
      ray?.destroy()
      ray = beam(from, to, width, last)
      ring(to, last ? CORE : FEL, 8, last ? 42 : 26, 0.16, last ? 3 : 2)
      mote(to, last ? CORE : FEL, last ? 10 : 6, last ? 18 : 12)
      punchCard(uid, last ? 'heavy' : 'light')
      drainStream(to, from)
      if (last) {
        const eye = felEye(to, 1.4)
        gsap.to(eye.scale, { x: 1.6, y: 1.6, duration: 0.18 })
        fadeKill(eye, 0.2)
        shakeCamera(7, 0.16)
        stamp('眼棱', '#68f542', 32)
      }
    }, at)
  }

  pulse(3.2, false, 0.44)
  tl.add(() => ctx.onImpact(), 0.44)
  pulse(5.4, false, 0.56)
  pulse(8.2, true, 0.68)

  tl.add(() => {
    ray?.destroy()
    fadeKill(mark, 0.16)
    fadeKill(rune, 0.16)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    gsap.to('.battle-center', { scale: 1, duration: 0.16 })
  }, 0.92)

  hold(tl, 1.08)
  return tl
}

function metamorphosis(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const url = cardArtUrl(ctx.actorUid)
  const rune = triRune(to, 1.4)
  const eye = felEye({ x: to.x, y: to.y + 6, w: 8, h: 8 }, 1.1)
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: VOID, alpha: 0.22 })
  overlayLayer?.addChild(veil)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -12, 0.14)
    const offsets = [
      { x: -16, y: -8, c: FEL },
      { x: 16, y: -8, c: DEMON },
      { x: -10, y: 10, c: SOUL },
      { x: 10, y: 10, c: FEL },
    ]
    for (const o of offsets) {
      shardToOrb({ x: from.x + o.x, y: from.y + o.y, w: 8, h: 8 }, 's3', o.c)
    }
  }, 0)

  tl.add(() => {
    ring({ x: from.x, y: from.y + from.h * 0.38, w: 8, h: 8 }, FEL, 10, 36, 0.2, 2)
    dashGhost(from, { x: from.x, y: from.y - 90, w: from.w, h: from.h }, url, 0.18, DEMON)
    liftCard(ctx.actorUid, -28, 0.18)
  }, 0.22)

  tl.add(() => {
    const aerial = ghost({ x: from.x, y: from.y - 70, w: from.w, h: from.h }, url, FEL)
    if (aerial) {
      aerial.alpha = 0.7
      const w = wings({ x: aerial.x, y: aerial.y, w: 8, h: 8 }, 1.15)
      fadeKill(w, 0.28, 0.12)
      fadeKill(aerial, 0.22, 0.14)
    }
    const skyEye = felEye({ x: from.x, y: from.y - 88, w: 8, h: 8 }, 1.6)
    fadeKill(skyEye, 0.24, 0.1)
    mote({ x: from.x, y: from.y - 70, w: 8, h: 8 }, FEL, 10, 22)
  }, 0.46)

  tl.add(() => {
    dashGhost({ x: to.x, y: to.y - 90, w: from.w, h: from.h }, to, url, 0.16, FEL)
    flashFel(0.38)
    ring(to, FEL, 14, 72, 0.28, 4)
    ring(to, DEMON, 10, 58, 0.3, 2.4)
    const column = new Graphics()
    column.blendMode = 'add'
    column.ellipse(0, 0, 18, 52).fill({ color: FEL, alpha: 0.55 })
    column.position.set(to.x, to.y)
    add('front', column)
    gsap.to(column.scale, { x: 1.6, y: 1.3, duration: 0.22 })
    fadeKill(column, 0.22)
    const w = wings(to, 1.25)
    fadeKill(w, 0.28, 0.12)
    mote(to, CORE, 14, 26)
    punchCard(uid, 'crit')
    shakeCamera(15, 0.22)
    ctx.onImpact()
    stamp('恶魔变形', '#d6ff78', 40)
  }, 0.8)

  tl.add(() => {
    stunMark(to)
    fadeKill(rune, 0.2)
    fadeKill(eye, 0.2)
  }, 0.98)

  tl.add(() => {
    fadeKill(veil, 0.24)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 1.18)

  hold(tl, 1.48)
  return tl
}

export function playHavocFx(ctx: FxContext): gsap.core.Timeline {
  const from = cardPoint(ctx.actorUid)
  const to = ctx.targetUid ? cardPoint(ctx.targetUid) : null
  const fail = gsap.timeline()
  fail.timeScale(ctx.timeScale)
  if (!from) {
    fail.add(() => ctx.onImpact())
    return fail
  }
  const meta = Boolean(ctx.metaForm)
  const tl =
    ctx.skillId === 'aa' && to && ctx.targetUid
      ? chaosStrike(ctx, from, to, ctx.targetUid, meta)
      : ctx.skillId === 's1'
        ? bladeDance(ctx, from, meta)
        : ctx.skillId === 's2' && to && ctx.targetUid
          ? eyeBeam(ctx, from, to, ctx.targetUid)
          : ctx.skillId === 's3' && to && ctx.targetUid
            ? metamorphosis(ctx, from, to, ctx.targetUid)
            : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
