import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const OBSIDIAN = 0x171820
const LAVA = 0xf06b2e
const MOLTEN = 0xd89a3a
const BRONZE = 0xc8a45a
const TIME = 0x7fc1d6
const FLARE = 0xfff2c5
const CRACK = 0x8f3029

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
  el.style.textShadow = '0 0 14px #000, 0 0 16px #d89a3a, 0 0 10px #8f3029'
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    delay: 0.4,
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
    g.circle(0, 0, 1.1 + Math.random() * 1.7).fill({ color, alpha: 0.95 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 10,
      alpha: 0,
      duration: 0.28 + Math.random() * 0.1,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function scale(at: Point, color: number, r = 6): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(0, -r)
    .lineTo(r * 0.72, 0)
    .lineTo(0, r)
    .lineTo(-r * 0.72, 0)
    .closePath()
    .fill({ color, alpha: 0.95 })
  g.circle(0, 0, r * 0.28).fill({ color: FLARE, alpha: 0.7 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function spike(at: Point, h = 28): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(0, -h)
    .lineTo(7, 8)
    .lineTo(-7, 8)
    .closePath()
    .fill({ color: OBSIDIAN, alpha: 0.92 })
  g.moveTo(0, -h + 4)
    .lineTo(3.2, 4)
    .lineTo(-3.2, 4)
    .closePath()
    .fill({ color: LAVA, alpha: 0.55 })
  g.position.set(at.x, at.y + 18)
  add('front', g)
  return g
}

function vein(from: Point, to: Point, color: number, width = 2): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  const mx = (from.x + to.x) / 2
  const my = Math.max(from.y, to.y) + 18
  g.moveTo(from.x, from.y + 22)
    .quadraticCurveTo(mx, my, to.x, to.y + 22)
    .stroke({ width: width + 3, color: OBSIDIAN, alpha: 0.35 })
  g.moveTo(from.x, from.y + 22)
    .quadraticCurveTo(mx, my, to.x, to.y + 22)
    .stroke({ width, color, alpha: 0.9 })
  add('back', g)
  return g
}

function clock(at: Point, r = 16): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, r).stroke({ width: 1.6, color: BRONZE, alpha: 0.9 })
  g.circle(0, 0, r * 0.55).stroke({ width: 1.1, color: TIME, alpha: 0.7 })
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8
    g.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2))
      .lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4))
      .stroke({ width: 1.2, color: BRONZE, alpha: 0.8 })
  }
  g.moveTo(0, 0).lineTo(0, -r * 0.7).stroke({ width: 1.6, color: FLARE, cap: 'round', alpha: 0.95 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function bronzeEye(at: Point, s = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 0, 14 * s, 7 * s).stroke({ width: 1.6, color: BRONZE, alpha: 0.95 })
  g.ellipse(0, 0, 4.5 * s, 4.5 * s).fill({ color: TIME, alpha: 0.95 })
  g.circle(0, 0, 1.8 * s).fill({ color: OBSIDIAN, alpha: 0.95 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function wings(at: Point, scaleN = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  const s = scaleN
  g.moveTo(0, 0)
    .quadraticCurveTo(-48 * s, -22 * s, -86 * s, 14 * s)
    .quadraticCurveTo(-38 * s, 12 * s, 0, 8 * s)
    .fill({ color: OBSIDIAN, alpha: 0.55 })
  g.moveTo(0, 0)
    .quadraticCurveTo(48 * s, -22 * s, 86 * s, 14 * s)
    .quadraticCurveTo(38 * s, 12 * s, 0, 8 * s)
    .fill({ color: OBSIDIAN, alpha: 0.55 })
  g.moveTo(-16 * s, -2 * s)
    .quadraticCurveTo(-52 * s, -16 * s, -78 * s, 8 * s)
    .stroke({ width: 1.7, color: MOLTEN, alpha: 0.7 })
  g.moveTo(16 * s, -2 * s)
    .quadraticCurveTo(52 * s, -16 * s, 78 * s, 8 * s)
    .stroke({ width: 1.7, color: MOLTEN, alpha: 0.7 })
  g.position.set(at.x, at.y)
  add('back', g)
  return g
}

function dragonHead(at: Point, s = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 4 * s, 18 * s, 14 * s).stroke({ width: 2, color: MOLTEN, alpha: 0.85 })
  g.moveTo(-10 * s, -6 * s).lineTo(-4 * s, -22 * s).lineTo(0, -8 * s).stroke({ width: 1.6, color: BRONZE, alpha: 0.8 })
  g.moveTo(10 * s, -6 * s).lineTo(4 * s, -22 * s).lineTo(0, -8 * s).stroke({ width: 1.6, color: BRONZE, alpha: 0.8 })
  g.circle(-6 * s, 2 * s, 2.2 * s).fill({ color: LAVA, alpha: 0.95 })
  g.circle(6 * s, 2 * s, 2.2 * s).fill({ color: LAVA, alpha: 0.95 })
  g.position.set(at.x, at.y)
  add('back', g)
  return g
}

function claw(at: Point): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(-12, -8).lineTo(-2, 14).stroke({ width: 2.4, color: CRACK, cap: 'round', alpha: 0.95 })
  g.moveTo(0, -12).lineTo(2, 16).stroke({ width: 2.6, color: LAVA, cap: 'round', alpha: 0.95 })
  g.moveTo(12, -8).lineTo(6, 14).stroke({ width: 2.2, color: MOLTEN, cap: 'round', alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function lavaColumn(at: Point): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.ellipse(0, 8, 14, 36).fill({ color: LAVA, alpha: 0.55 })
  g.ellipse(0, 2, 7, 28).fill({ color: FLARE, alpha: 0.7 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
}

function shardToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = scale(from, MOLTEN, 6)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, MOLTEN, 4, 14, 0.16, 2)
      g.destroy()
    },
  })
}

function shardToOrb(from: Point, skillId: string, color: number): void {
  const host = document.querySelector<HTMLElement>(`.skill-orb[data-skill="${skillId}"]`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = scale(from, color, 5)
  gsap.to(g, {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    duration: 0.24,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, color, 4, 16, 0.16, 2)
      g.destroy()
    },
  })
}

function allyHits(ctx: FxContext): { uid: string; pt: Point }[] {
  return [...document.querySelectorAll<HTMLElement>(`.battle-card.${ctx.side}:not(.is-dead)`)]
    .map((el) => el.dataset.uid)
    .filter((uid): uid is string => Boolean(uid))
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))
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

function eruption(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const extend = Boolean(ctx.ebonExtend)
  const mark = new Graphics()
  mark.blendMode = 'add'
  mark.ellipse(0, 0, 22, 10).stroke({ width: 1.6, color: MOLTEN, alpha: 0.85 })
  mark.circle(0, 0, 4).fill({ color: LAVA, alpha: 0.9 })
  mark.position.set(to.x, to.y + 22)
  add('back', mark)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    const line = vein(from, to, MOLTEN, 2.2)
    fadeKill(line, 0.4, 0.2)
    mote({ x: to.x, y: to.y + 18, w: 8, h: 8 }, BRONZE, 5, 10)
  }, 0)

  tl.add(() => {
    const col = lavaColumn(to)
    gsap.to(col.scale, { x: 1.35, y: 1.5, duration: 0.18, ease: 'power2.out' })
    fadeKill(col, 0.22)
    for (let i = -1; i <= 1; i++) {
      const s = spike({ x: to.x + i * 14, y: to.y, w: 8, h: 8 }, 22 + Math.abs(i) * 4)
      gsap.fromTo(s, { y: to.y + 28, alpha: 0.4 }, { y: to.y + 10, alpha: 1, duration: 0.12 })
      fadeKill(s, 0.2, 0.1)
    }
    ring(to, MOLTEN, 10, 42, 0.22, 2.4)
    mote(to, LAVA, 8, 18)
    mote(to, FLARE, 5, 12)
    liftCard(uid, -12, 0.1)
    punchCard(uid, 'heavy')
    shakeCamera(6, 0.14)
    ctx.onImpact()
  }, 0.26)

  tl.add(() => {
    settleCard(uid)
    shardToSp(to, ctx.side)
    fadeKill(mark, 0.2)
  }, 0.42)

  if (extend) {
    tl.add(() => {
      const back = vein(to, from, BRONZE, 2.4)
      fadeKill(back, 0.28)
      const eye = clock({ x: from.x, y: from.y - 8, w: 8, h: 8 }, 18)
      gsap.to(eye, { rotation: 0.6, duration: 0.28 })
      fadeKill(eye, 0.24, 0.12)
      for (const hit of allyHits(ctx)) ring(hit.pt, MOLTEN, 8, 22, 0.16, 1.6)
      stamp('黑檀之力延长', '#fff2c5', 28)
    }, 0.52)
  } else {
    tl.add(() => stamp('喷发', '#f06b2e', 30), 0.48)
  }

  tl.add(() => {
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, extend ? 0.72 : 0.58)

  hold(tl, extend ? 0.84 : 0.68)
  return tl
}

function ebonMight(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const allies = allyHits(ctx)
  const head = dragonHead({ x: from.x, y: from.y + 8, w: 8, h: 8 }, 1.15)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    shardToOrb(from, 's2', MOLTEN)
    shardToOrb({ x: from.x + 10, y: from.y - 8, w: 8, h: 8 }, 's2', OBSIDIAN)
    gsap.to('.battle-center', { scale: 0.98, duration: 0.2 })
  }, 0)

  tl.add(() => {
    const w = wings(from, 0.95)
    fadeKill(w, 0.32, 0.12)
    for (const ally of allies) {
      const line = vein(from, ally.pt, MOLTEN, 1.8)
      fadeKill(line, 0.36)
    }
    mote(from, LAVA, 8, 16)
  }, 0.16)

  tl.add(() => {
    for (const ally of allies) {
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4
        const sc = scale(
          { x: ally.pt.x + Math.cos(a) * 18, y: ally.pt.y + Math.sin(a) * 12, w: 8, h: 8 },
          i % 2 ? MOLTEN : BRONZE,
          4.5,
        )
        gsap.to(sc, { x: ally.pt.x, y: ally.pt.y, duration: 0.18, ease: 'power2.in' })
        fadeKill(sc, 0.12, 0.16)
      }
      ring(ally.pt, MOLTEN, 8, 24, 0.18, 1.8)
      punchCard(ally.uid, 'light')
    }
    ctx.onImpact()
    stamp('黑檀之力', '#d89a3a', 34)
  }, 0.4)

  tl.add(() => {
    fadeKill(head, 0.2)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    gsap.to('.battle-center', { scale: 1, duration: 0.16 })
  }, 0.78)

  hold(tl, 0.98)
  return tl
}

function deepBreath(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const foes = foeHits(ctx)
  const xs = foes.map((h) => h.pt.x)
  const ys = foes.map((h) => h.pt.y)
  const minX = xs.length ? Math.min(...xs) - 40 : from.x - 80
  const maxX = xs.length ? Math.max(...xs) + 40 : from.x + 80
  const cy = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : from.y - 80
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: OBSIDIAN, alpha: 0.16 })
  overlayLayer?.addChild(veil)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -10, 0.12)
    shardToOrb(from, 's3', MOLTEN)
    shardToOrb({ x: from.x - 10, y: from.y - 6, w: 8, h: 8 }, 's3', BRONZE)
    shardToOrb({ x: from.x + 10, y: from.y - 6, w: 8, h: 8 }, 's3', LAVA)
    for (const foe of foes) {
      const print = claw({ x: foe.pt.x, y: foe.pt.y + 22, w: 8, h: 8 })
      print.alpha = 0.45
      fadeKill(print, 0.4, 0.2)
    }
  }, 0)

  tl.add(() => {
    const path = new Graphics()
    path.blendMode = 'add'
    path.moveTo(minX, cy + 18).lineTo(maxX, cy + 18).stroke({ width: 4, color: LAVA, alpha: 0.55 })
    add('back', path)
    fadeKill(path, 0.7)
    const w = wings({ x: (minX + maxX) / 2, y: cy - 18, w: 8, h: 8 }, 1.25)
    fadeKill(w, 0.28, 0.16)
    const head = dragonHead({ x: minX + 20, y: cy - 10, w: 8, h: 8 }, 1.2)
    gsap.to(head, { x: maxX - 10, duration: 0.42, ease: 'power1.in' })
    fadeKill(head, 0.16, 0.36)
  }, 0.28)

  tl.add(() => {
    const flame = new Graphics()
    flame.blendMode = 'add'
    flame.ellipse(0, 0, 90, 18).fill({ color: LAVA, alpha: 0.45 })
    flame.ellipse(0, 0, 60, 10).fill({ color: FLARE, alpha: 0.55 })
    flame.position.set(minX, cy)
    add('front', flame)
    gsap.to(flame, { x: maxX, duration: 0.36, ease: 'none' })
    fadeKill(flame, 0.12, 0.32)
    ctx.onImpact()
  }, 0.52)

  foes.forEach((foe, i) => {
    tl.add(() => {
      ring(foe.pt, LAVA, 8, 28, 0.16, 2)
      mote(foe.pt, MOLTEN, 6, 14)
      const mark = claw(foe.pt)
      fadeKill(mark, 0.28, 0.16)
      punchCard(foe.uid, 'heavy')
    }, 0.52 + i * 0.05)
  })

  tl.add(() => {
    shakeCamera(10, 0.18)
    stamp('深呼吸', '#fff2c5', 36)
  }, 0.52 + Math.max(0, foes.length - 1) * 0.05)

  tl.add(() => {
    fadeKill(veil, 0.22)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 1.05)

  hold(tl, 1.32)
  return tl
}

function prescience(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const allies = allyHits(ctx)
  tl.add(() => {
    liftCard(ctx.actorUid, -6, 0.1)
    const eye = bronzeEye({ x: from.x, y: from.y - 18, w: 8, h: 8 }, 1.2)
    const rim = clock({ x: from.x, y: from.y - 18, w: 8, h: 8 }, 22)
    gsap.to(rim, { rotation: 0.8, duration: 0.4 })
    fadeKill(eye, 0.28, 0.18)
    fadeKill(rim, 0.28, 0.18)
    for (const ally of allies) {
      const line = new Graphics()
      line.blendMode = 'add'
      line.moveTo(from.x, from.y - 18).lineTo(ally.pt.x, ally.pt.y).stroke({ width: 1.2, color: BRONZE, alpha: 0.55 })
      add('back', line)
      fadeKill(line, 0.32)
      const e = bronzeEye({ x: ally.pt.x, y: ally.pt.y + 18, w: 8, h: 8 }, 0.65)
      fadeKill(e, 0.28, 0.12)
    }
    ctx.onImpact()
    stamp('先知先觉', '#7fc1d6', 28)
    settleCard(ctx.actorUid)
  }, 0)
  hold(tl, 0.58)
  return tl
}

export function playAugFx(ctx: FxContext): gsap.core.Timeline {
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
      ? eruption(ctx, from, to, ctx.targetUid)
      : ctx.skillId === 's1'
        ? prescience(ctx, from)
        : ctx.skillId === 's2'
          ? ebonMight(ctx, from)
          : ctx.skillId === 's3'
            ? deepBreath(ctx, from)
            : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
