import gsap from 'gsap'
import { Graphics, Sprite, Texture } from 'pixi.js'
import { cardArtUrl, cardPoint, dimCard, punchCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const GOLD = 0xf4c95d
const IVORY = 0xfff8d8
const ROYAL = 0x24518a
const STEEL = 0xc7d3dd
const FIRE = 0xf58a2a
const LIFE = 0x79e3b1

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
    g.circle(0, 0, 1.2 + Math.random() * 2.2).fill({ color, alpha: 1 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.35
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 8,
      alpha: 0,
      duration: 0.26 + Math.random() * 0.12,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function ring(at: Point, color: number, from = 10, to = 52, duration = 0.28, width = 3): void {
  const g = new Graphics()
  g.blendMode = 'add'
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
  el.style.textShadow = '0 0 14px #000, 0 0 18px #f4c95d'
  document.body.appendChild(el)
  return el
}

function ghost(from: Point, url: string | null, tint = 0xdce6f2): Sprite | null {
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

function drawKiteShield(g: Graphics, scale = 1): void {
  const w = 18 * scale
  const h = 24 * scale
  g.moveTo(0, -h)
    .lineTo(w, -h * 0.35)
    .lineTo(w * 0.78, h * 0.28)
    .lineTo(0, h)
    .lineTo(-w * 0.78, h * 0.28)
    .lineTo(-w, -h * 0.35)
    .closePath()
}

function makeShield(at: Point, scale = 1, fill = ROYAL): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  drawKiteShield(g, scale)
  g.fill({ color: fill, alpha: 0.55 })
  drawKiteShield(g, scale)
  g.stroke({ width: 2.4 * scale, color: GOLD, alpha: 0.95 })
  g.moveTo(0, -18 * scale).lineTo(0, 20 * scale).stroke({ width: 1.6 * scale, color: IVORY, alpha: 0.85 })
  g.moveTo(-10 * scale, -4 * scale).lineTo(10 * scale, -4 * scale).stroke({ width: 1.6 * scale, color: IVORY, alpha: 0.85 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function holyCross(at: Point, size = 28): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(-size, 0).lineTo(size, 0).stroke({ width: 4, color: IVORY, alpha: 0.95, cap: 'round' })
  g.moveTo(0, -size).lineTo(0, size).stroke({ width: 4, color: IVORY, alpha: 0.95, cap: 'round' })
  g.moveTo(-size * 0.72, 0).lineTo(size * 0.72, 0).stroke({ width: 8, color: GOLD, alpha: 0.45, cap: 'round' })
  g.moveTo(0, -size * 0.72).lineTo(0, size * 0.72).stroke({ width: 8, color: GOLD, alpha: 0.45, cap: 'round' })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: 1.7, y: 1.7, duration: 0.18, ease: 'power2.out' })
  fadeKill(g, 0.22)
}

function hammer(at: Point): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.roundRect(-16, -28, 32, 18, 3).fill({ color: STEEL, alpha: 0.95 })
  g.roundRect(-16, -28, 32, 18, 3).stroke({ width: 2, color: GOLD, alpha: 0.95 })
  g.roundRect(-3, -12, 6, 38, 1).fill({ color: STEEL, alpha: 0.9 })
  g.circle(0, -20, 5).fill({ color: IVORY, alpha: 0.9 })
  g.position.set(at.x, at.y - 90)
  add('front', g)
  return g
}

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  drawKiteShield(g, 0.42)
  g.fill({ color: GOLD, alpha: 0.95 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.32,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, GOLD, 4, 16, 0.2, 2)
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
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => g.destroy(),
  })
}

function groundSeal(at: Point, color: number): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 0, 28, 11).stroke({ width: 2, color, alpha: 0.8 })
  drawKiteShield(g, 0.55)
  g.stroke({ width: 1.6, color, alpha: 0.75 })
  g.position.set(at.x, at.y + at.h * 0.42)
  add('back', g)
  fadeKill(g, 0.42, 0.1)
}

function bounceTargets(ctx: FxContext): { uid: string; pt: Point }[] {
  const ids = ctx.targetUids?.length ? ctx.targetUids : ctx.targetUid ? [ctx.targetUid] : []
  return ids
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))
    .sort((a, b) => a.pt.x - b.pt.x)
}

export function playProtFx(ctx: FxContext): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  const from = cardPoint(ctx.actorUid)
  if (!from) {
    tl.add(() => ctx.onImpact())
    return tl
  }
  tl.timeScale(ctx.timeScale)
  if (ctx.skillId === 'aa') judgment(tl, ctx, from)
  else if (ctx.skillId === 's1') righteousShield(tl, ctx, from)
  else if (ctx.skillId === 's2') avengerShield(tl, ctx, from)
  else if (ctx.skillId === 's3') ardentDefender(tl, ctx, from)
  else {
    tl.add(() => ctx.onImpact())
    tl.to({}, { duration: 0.2 })
  }
  return tl
}

function judgment(tl: gsap.core.Timeline, ctx: FxContext, from: Point): void {
  const target = (ctx.targetUid ? cardPoint(ctx.targetUid) : null) ?? from
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0xf4e4b2)
  const mark = new Graphics()
  mark.blendMode = 'add'
  mark.circle(0, 0, 16).stroke({ width: 2, color: GOLD, alpha: 0.9 })
  mark.moveTo(0, -10).lineTo(0, 10).stroke({ width: 2, color: IVORY, alpha: 0.85 })
  mark.position.set(target.x, target.y - target.h * 0.42)
  add('front', mark)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    groundSeal(from, GOLD)
    if (shade) gsap.to(shade, { y: from.y - 8, duration: 0.12 })
  })
  const mallet = hammer(target)
  tl.add(() => {
    gsap.to(mallet, { y: target.y - 8, rotation: 0.15, duration: 0.14, ease: 'power3.in' })
  }, 0.12)
  tl.add(() => {
    holyCross(target, 26)
    sparks(target, GOLD, 8, 22)
    sparks(target, IVORY, 5, 16)
    ring(target, GOLD, 8, 40, 0.2, 2)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'light')
    shakeCamera(4, 0.14)
    ctx.onImpact()
    fadeKill(mallet, 0.16)
    fadeKill(mark, 0.18)
    pearlToSp(target, ctx.side)
  }, 0.28)
  tl.to({}, { duration: 0.05 })
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.16)
  }, 0.5)
  tl.to({}, { duration: 0.16 })
}

function righteousShield(tl: gsap.core.Timeline, ctx: FxContext, from: Point): void {
  const target = (ctx.targetUid ? cardPoint(ctx.targetUid) : null) ?? from
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0xc7d3dd)
  const shield = makeShield({ ...from, x: from.x - 10, y: from.y + 6 }, 1.15, ROYAL)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    emberToOrb(from, 's1', GOLD)
    ring({ x: from.x, y: from.y + from.h * 0.42, w: 8, h: 8 }, ROYAL, 10, 36, 0.2, 2)
    gsap.to('.battle-center', { scale: 1.02, duration: 0.18, transformOrigin: '50% 45%' })
    if (shade) gsap.to(shade, { x: from.x + 8, y: from.y + 6, duration: 0.16 })
    gsap.to(shield.scale, { x: 1.2, y: 1.2, duration: 0.16 })
  })
  tl.add(() => {
    if (shade) gsap.to(shade, { x: target.x - 6, y: target.y, duration: 0.16, ease: 'power3.in' })
    gsap.to(shield, { x: target.x, y: target.y, rotation: 0.35, duration: 0.16, ease: 'power3.in' })
  }, 0.2)
  tl.add(() => {
    const bash = makeShield(target, 1.8, IVORY)
    fadeKill(bash, 0.22)
    ring(target, GOLD, 12, 56, 0.24, 3)
    sparks(target, STEEL, 8, 26)
    sparks(target, GOLD, 8, 22)
    punchCard(ctx.targetUid ?? ctx.actorUid, 'heavy')
    shakeCamera(9, 0.22)
    ctx.onImpact()
    fadeKill(shield, 0.14)
  }, 0.38)
  tl.to({}, { duration: 0.07 })
  tl.add(() => {
    const allies = (ctx.targetUids ?? []).filter((uid) => uid !== ctx.targetUid)
    const core = new Graphics()
    core.blendMode = 'add'
    core.circle(0, 0, 10).fill({ color: GOLD, alpha: 0.85 })
    core.position.set(target.x, target.y)
    add('front', core)
    fadeKill(core, 0.22)
    for (const uid of allies) {
      const pt = cardPoint(uid)
      if (!pt) continue
      const beam = new Graphics()
      beam.blendMode = 'add'
      beam.moveTo(target.x, target.y).lineTo(pt.x, pt.y).stroke({ width: 3, color: GOLD, alpha: 0.7, cap: 'round' })
      add('front', beam)
      fadeKill(beam, 0.28)
      ring(pt, LIFE, 6, 28, 0.22, 2)
      sparks(pt, LIFE, 4, 12)
    }
    gsap.to('.battle-center', { scale: 1, duration: 0.18 })
  }, 0.52)
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.16)
  }, 0.78)
  tl.to({}, { duration: 0.16 })
}

function avengerShield(tl: gsap.core.Timeline, ctx: FxContext, from: Point): void {
  const hits = bounceTargets(ctx)
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0xc7d3dd)
  const flying = makeShield({ ...from, x: from.x + 8, y: from.y - 4 }, 1.05, ROYAL)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    emberToOrb(from, 's2', GOLD)
    emberToOrb({ ...from, x: from.x + 8 }, 's2', ROYAL)
    gsap.to(flying, { rotation: Math.PI * 2, duration: 0.18, repeat: 8, ease: 'none' })
    if (shade) gsap.to(shade, { rotation: -0.25, duration: 0.16 })
  })

  let t = 0.18
  hits.forEach((hit, i) => {
    tl.add(() => {
      gsap.to(flying, { x: hit.pt.x, y: hit.pt.y, duration: 0.09, ease: 'power2.inOut' })
    }, t)
    tl.add(() => {
      ring(hit.pt, GOLD, 6, 28, 0.16, 2)
      sparks(hit.pt, GOLD, 5, 14)
      punchCard(hit.uid, 'light')
      if (i === 0) {
        shakeCamera(4, 0.12)
        ctx.onImpact()
      }
      if (i === hits.length - 1) shakeCamera(5, 0.14)
    }, t + 0.09)
    t += 0.1
  })

  if (hits.length === 0) {
    tl.add(() => ctx.onImpact(), 0.2)
  }

  tl.add(() => {
    gsap.to(flying, { x: from.x, y: from.y, duration: 0.22, ease: 'power2.in' })
  }, t)
  tl.add(() => {
    ring(from, IVORY, 8, 26, 0.18, 2)
    fadeKill(flying, 0.12)
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.16)
  }, t + 0.22)
  tl.to({}, { duration: 0.18 }, t + 0.34)
}

function ardentDefender(tl: gsap.core.Timeline, ctx: FxContext, from: Point): void {
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0xf4c95d)
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x0c1018, alpha: 0.18 })
  add('overlay', veil)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    for (let i = 0; i < 5; i++) emberToOrb({ ...from, x: from.x + (i - 2) * 8 }, 's3', GOLD)
    groundSeal(from, GOLD)
  })
  tl.add(() => {
    const planted = makeShield({ ...from, y: from.y + 10 }, 1.6, ROYAL)
    gsap.to(planted, { y: from.y + from.h * 0.28, duration: 0.16, ease: 'power3.in' })
    fadeKill(planted, 0.36, 0.08)
    ring({ x: from.x, y: from.y + from.h * 0.42, w: 8, h: 8 }, GOLD, 14, 64, 0.28, 3)
    shakeCamera(6, 0.18)
  }, 0.2)
  tl.add(() => {
    const wing = new Graphics()
    wing.blendMode = 'add'
    wing.ellipse(-38, -8, 36, 16).fill({ color: GOLD, alpha: 0.35 })
    wing.ellipse(38, -8, 36, 16).fill({ color: GOLD, alpha: 0.35 })
    wing.ellipse(-42, -10, 30, 10).fill({ color: FIRE, alpha: 0.28 })
    wing.ellipse(42, -10, 30, 10).fill({ color: FIRE, alpha: 0.28 })
    wing.circle(0, -6, 14).fill({ color: IVORY, alpha: 0.45 })
    wing.position.set(from.x, from.y)
    add('front', wing)
    fadeKill(wing, 0.55, 0.12)
    sparks(from, GOLD, 12, 28)
    sparks(from, FIRE, 8, 20)
    const mark = stamp('炽热防御者', '#f4c95d')
    gsap.to(mark, { opacity: 0, duration: 0.35, delay: 0.4, onComplete: () => mark.remove() })
    ctx.onImpact()
  }, 0.46)
  tl.add(() => {
    dimCard(ctx.actorUid, false)
    if (shade) fadeKill(shade, 0.2)
    fadeKill(veil, 0.24)
  }, 0.95)
  tl.to({}, { duration: 0.28 })
}
