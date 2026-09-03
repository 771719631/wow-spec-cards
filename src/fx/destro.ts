import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardPoint, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const ORANGE = 0xff6a1a
const CORE = 0xffe08a
const EMBER = 0xc44512
const SMOKE = 0x1a100c
const FEL = 0x6dff4a
const FEL_CORE = 0xd8ff9a
const VOID = 0x4a1a6a
const BLOOD = 0x8a1a1a
const CRIMSON = 0xc44536

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
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    delay: 0.32,
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
  g.circle(0, 0, from).stroke({ width: 2.4, color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: to / from, y: to / from, duration: 0.22, ease: 'power2.out' })
  fadeKill(g, 0.22)
}

function smoke(at: Point, n = 4): void {
  for (let i = 0; i < n; i++) {
    const g = new Graphics()
    g.ellipse(0, 0, 8 + Math.random() * 6, 10 + Math.random() * 8).fill({ color: SMOKE, alpha: 0.45 })
    g.position.set(at.x + (Math.random() - 0.5) * 12, at.y)
    add('back', g)
    gsap.to(g, {
      y: g.y - 22 - Math.random() * 12,
      x: g.x + (Math.random() - 0.5) * 16,
      alpha: 0,
      duration: 0.4,
      ease: 'sine.out',
      onComplete: () => g.destroy(),
    })
  }
}

function embers(at: Point, color: number, n: number, spread: number): void {
  for (let i = 0; i < n; i++) {
    const g = new Graphics()
    g.blendMode = 'add'
    g.circle(0, 0, 1.4 + Math.random() * 2).fill({ color, alpha: 1 })
    g.position.set(at.x, at.y)
    add('front', g)
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.35
    gsap.to(g, {
      x: at.x + Math.cos(ang) * spread,
      y: at.y + Math.sin(ang) * spread - 8,
      alpha: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function pearlToSp(from: Point, side: FxContext['side'], color = ORANGE): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 6).fill({ color, alpha: 0.95 })
  g.circle(-2, -2, 2.2).fill({ color: CORE, alpha: 0.9 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      sparkRing({ x: g.x, y: g.y, w: 8, h: 8 }, CORE, 4, 16)
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
    duration: 0.28,
    ease: 'power2.in',
    onComplete: () => {
      sparkRing({ x: g.x, y: g.y, w: 8, h: 8 }, color, 4, 18)
      g.destroy()
    },
  })
}

function flameBolt(from: Point, to: Point, delay: number, tint: 'incin' | 'shadow' | 'chaos' | 'chaos-copy', scale = 1): void {
  const g = new Graphics()
  g.blendMode = 'add'
  if (tint === 'chaos' || tint === 'chaos-copy') {
    const r = 10 * scale
    g.circle(0, 0, r).fill({ color: FEL, alpha: 0.92 })
    g.circle(-r * 0.25, -r * 0.2, r * 0.4).fill({ color: FEL_CORE, alpha: 0.95 })
    g.circle(0, 0, r + 4).stroke({ width: 2, color: tint === 'chaos-copy' ? CRIMSON : VOID, alpha: 0.75 })
    g.circle(-3, -2, 1.6).fill({ color: SMOKE, alpha: 0.8 })
    g.circle(3, -2, 1.6).fill({ color: SMOKE, alpha: 0.8 })
  } else {
    g.moveTo(14, 0).lineTo(-12, 6).lineTo(-8, 0).lineTo(-12, -6).fill({
      color: tint === 'shadow' ? BLOOD : ORANGE,
      alpha: 0.95,
    })
    g.circle(4, 0, 4).fill({ color: CORE, alpha: 0.9 })
  }
  g.position.set(from.x, from.y)
  g.rotation = Math.atan2(to.y - from.y, to.x - from.x)
  add('front', g)
  const midX = (from.x + to.x) / 2 + (tint === 'shadow' || tint === 'chaos-copy' ? 28 : -16)
  const midY = Math.min(from.y, to.y) - 26
  gsap.to(g, { x: midX, y: midY, duration: 0.12, delay, ease: 'power1.out' })
  gsap.to(g, {
    x: to.x,
    y: to.y,
    duration: tint.startsWith('chaos') ? 0.22 : 0.16,
    delay: delay + 0.12,
    ease: 'power2.in',
    onComplete: () => g.destroy(),
  })
}

function burst(at: Point, color: number, big: boolean): void {
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, big ? 14 : 8).fill({ color, alpha: 0.9 })
  g.position.set(at.x, at.y)
  add('front', g)
  gsap.to(g.scale, { x: big ? 3.1 : 2.2, y: big ? 3.1 : 2.2, duration: 0.22, ease: 'power2.out' })
  fadeKill(g, 0.22)
}

function arrayBox(hits: { uid: string; pt: Point }[]): { cx: number; cy: number; rx: number; ry: number } | null {
  if (!hits.length) return null
  const xs = hits.map((h) => h.pt.x)
  const ys = hits.map((h) => h.pt.y)
  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: ys.reduce((s, y) => s + y, 0) / ys.length + 18,
    rx: Math.max(70, (Math.max(...xs) - Math.min(...xs)) / 2 + 48),
    ry: 22,
  }
}

function incinerate(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const havoc = ctx.havocUid && ctx.havocUid !== uid ? cardPoint(ctx.havocUid) : null
  tl.add(() => {
    liftCard(ctx.actorUid, -8, 0.1)
    const orb = new Graphics()
    orb.blendMode = 'add'
    orb.circle(0, 0, 8).fill({ color: ORANGE, alpha: 0.9 })
    orb.circle(0, 0, 12).stroke({ width: 1.6, color: FEL, alpha: 0.45 })
    orb.position.set(from.x, from.y - 10)
    add('front', orb)
    fadeKill(orb, 0.16, 0.08)
    embers(from, ORANGE, 5, 16)
  }, 0)
  tl.add(() => {
    flameBolt(from, to, 0, 'incin')
    if (havoc && ctx.havocUid) flameBolt(from, havoc, 0.06, 'shadow', 0.9)
  }, 0.12)
  tl.add(() => {
    burst(to, ORANGE, false)
    smoke(to, 3)
    embers(to, CORE, 7, 20)
    punchCard(uid, 'heavy')
    if (havoc && ctx.havocUid) {
      burst(havoc, BLOOD, false)
      punchCard(ctx.havocUid, 'light')
    }
    shakeCamera(3, 0.12)
    ctx.onImpact()
  }, 0.38)
  tl.add(() => {
    pearlToSp(to, ctx.side, ORANGE)
    const next = Math.min(2, (ctx.chaosStacks ?? 0) + 1)
    emberToOrb(to, 's1', next >= 2 ? CORE : EMBER)
    settleCard(ctx.actorUid)
  }, 0.48)
  hold(tl, 0.64)
  return tl
}

function chaosBolt(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const stacks = ctx.chaosStacks ?? 0
  const havoc = ctx.havocUid && ctx.havocUid !== uid ? cardPoint(ctx.havocUid) : null
  const scale = 1 + stacks * 0.12
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x0a0610, alpha: 0.2 })
  overlayLayer?.addChild(veil)
  tl.add(() => {
    liftCard(ctx.actorUid, -10, 0.14)
    gsap.to('.battle-center', { scale: 1.03, duration: 0.16 })
    const core = new Graphics()
    core.blendMode = 'add'
    core.circle(0, 0, 10 * scale).fill({ color: FEL, alpha: 0.9 })
    core.circle(0, 0, 16 * scale).stroke({ width: 2, color: VOID, alpha: 0.7 })
    core.position.set(from.x, from.y - 8)
    add('front', core)
    fadeKill(core, 0.18, 0.12)
    if (stacks > 0) stamp(stacks >= 2 ? '完全增幅' : '烧尽增幅', '#6dff4a', 28)
  }, 0)
  tl.add(() => {
    flameBolt(from, to, 0, 'chaos', scale)
    if (havoc && ctx.havocUid) flameBolt(from, havoc, 0.08, 'chaos-copy', scale * 0.9)
  }, 0.28)
  tl.add(() => {
    const flash = new Graphics()
    flash.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0xffffff, alpha: 0.28 })
    overlayLayer?.addChild(flash)
    fadeKill(flash, 0.08)
    burst(to, FEL, true)
    sparkRing(to, VOID, 12, 52)
    smoke(to, 5)
    embers(to, FEL, 10, 28)
    punchCard(uid, 'crit')
    shakeCamera(11, 0.22)
    ctx.onImpact()
    gsap.to('.battle-center', { scale: 1, duration: 0.18 })
  }, 0.62)
  if (havoc && ctx.havocUid) {
    tl.add(() => {
      burst(havoc, CRIMSON, true)
      punchCard(ctx.havocUid!, 'heavy')
      smoke(havoc, 4)
    }, 0.7)
  }
  tl.add(() => {
    fadeKill(veil, 0.24)
    settleCard(ctx.actorUid)
  }, 0.88)
  hold(tl, 1.05)
  return tl
}

function havoc(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  tl.add(() => {
    const sigil = new Graphics()
    sigil.blendMode = 'add'
    sigil.ellipse(0, 0, 28, 12).stroke({ width: 2.4, color: CRIMSON, alpha: 0.9 })
    sigil.moveTo(-16, -6).lineTo(-22, -18).stroke({ width: 2.2, color: BLOOD, cap: 'round' })
    sigil.moveTo(16, -6).lineTo(22, -18).stroke({ width: 2.2, color: BLOOD, cap: 'round' })
    sigil.position.set(to.x, to.y + 18)
    add('back', sigil)
    fadeKill(sigil, 0.32, 0.12)
    const beam = new Graphics()
    beam.blendMode = 'add'
    beam.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({ width: 4, color: CRIMSON, cap: 'round', alpha: 0.8 })
    add('front', beam)
    fadeKill(beam, 0.2, 0.06)
  }, 0)
  tl.add(() => {
    const eye = new Graphics()
    eye.blendMode = 'add'
    eye.ellipse(0, 0, 16, 8).fill({ color: BLOOD, alpha: 0.75 })
    eye.circle(0, 0, 3.5).fill({ color: CORE, alpha: 0.95 })
    eye.position.set(to.x, to.y - 22)
    add('front', eye)
    fadeKill(eye, 0.28, 0.12)
    stamp('浩劫', '#c44536', 32)
    punchCard(uid, 'light')
    embers(to, CRIMSON, 6, 16)
    ctx.onImpact()
  }, 0.18)
  hold(tl, 0.48)
  return tl
}

function rainOfFire(ctx: FxContext, _from: Point, hits: { uid: string; pt: Point }[]): gsap.core.Timeline {
  const tl = gsap.timeline()
  const box = arrayBox(hits)
  tl.add(() => {
    liftCard(ctx.actorUid, -8, 0.12)
    if (box) {
      const g = new Graphics()
      g.blendMode = 'add'
      for (let i = 1; i <= 4; i++) {
        g.ellipse(0, 0, box.rx * (0.35 + i * 0.16), box.ry * (0.45 + i * 0.12)).stroke({
          width: 2,
          color: i === 4 ? CORE : ORANGE,
          alpha: 0.35 + i * 0.12,
        })
      }
      g.position.set(box.cx, box.cy)
      add('back', g)
      fadeKill(g, 1.1, 0.2)
    }
    for (const hit of hits) sparkRing({ x: hit.pt.x, y: hit.pt.y + 16, w: 8, h: 8 }, EMBER, 5, 18)
  }, 0)
  const waves: { at: number; size: number; color: number; shake: number; punch: 'light' | 'heavy' | 'crit' }[] = [
    { at: 0.28, size: 6, color: ORANGE, shake: 3, punch: 'light' },
    { at: 0.48, size: 9, color: ORANGE, shake: 5, punch: 'heavy' },
    { at: 0.68, size: 10, color: FEL, shake: 7, punch: 'heavy' },
    { at: 0.9, size: 16, color: CORE, shake: 12, punch: 'crit' },
  ]
  waves.forEach((wave, wi) => {
    tl.add(() => {
      for (const hit of hits) {
        const rock = new Graphics()
        rock.blendMode = 'add'
        rock.circle(0, 0, wave.size).fill({ color: wave.color, alpha: 0.95 })
        if (wi >= 2) rock.circle(0, 0, wave.size + 3).stroke({ width: 1.6, color: FEL, alpha: 0.6 })
        rock.position.set(hit.pt.x + (Math.random() - 0.5) * 18, hit.pt.y - 90 - wi * 8)
        add('front', rock)
        gsap.to(rock, {
          y: hit.pt.y,
          duration: 0.16,
          ease: 'power2.in',
          onComplete: () => {
            burst(hit.pt, wave.color, wi === 3)
            smoke(hit.pt, wi === 3 ? 4 : 2)
            rock.destroy()
          },
        })
        punchCard(hit.uid, wave.punch)
      }
      shakeCamera(wave.shake, 0.16)
      if (wi === 0) ctx.onImpact()
    }, wave.at)
  })
  tl.add(() => settleCard(ctx.actorUid), 1.12)
  hold(tl, 1.38)
  return tl
}

export function playDestroFx(ctx: FxContext): gsap.core.Timeline {
  const from = cardPoint(ctx.actorUid)
  const hits = hitList(ctx)
  const to = hits[0]?.pt ?? (ctx.targetUid ? cardPoint(ctx.targetUid) : null)
  const fail = gsap.timeline()
  fail.timeScale(ctx.timeScale)
  if (!from) {
    fail.add(() => ctx.onImpact())
    return fail
  }
  const tl =
    ctx.skillId === 'aa' && to && hits[0]
      ? incinerate(ctx, from, to, hits[0].uid)
      : ctx.skillId === 's1' && to && hits[0]
        ? chaosBolt(ctx, from, to, hits[0].uid)
        : ctx.skillId === 's2' && to && (hits[0] || ctx.targetUid)
          ? havoc(ctx, from, to, hits[0]?.uid ?? ctx.targetUid!)
          : ctx.skillId === 's3'
            ? rainOfFire(ctx, from, hits)
            : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
