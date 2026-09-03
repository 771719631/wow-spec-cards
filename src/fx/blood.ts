import gsap from 'gsap'
import { Graphics, Sprite, Texture } from 'pixi.js'
import { cardArtUrl, cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const BLOOD = 0x8f1d2c
const FLARE = 0xe14852
const RUNE = 0x65bce8
const SOUL = 0x8faec4
const VEIL = 0x36284e
const BONE = 0xd8d1bc
const SHADE = 0x12151c

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

function stamp(text: string, color: string, size = 34): HTMLElement {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  el.style.fontSize = `${size}px`
  el.style.textShadow = '0 0 14px #000, 0 0 16px #8f1d2c'
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.24,
    delay: 0.4,
    onComplete: () => el.remove(),
  })
  return el
}

function ring(at: Point, color: number, from = 8, to = 36, duration = 0.22, width = 2.2): void {
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
      duration: 0.28 + Math.random() * 0.1,
      ease: 'power2.out',
      onComplete: () => g.destroy(),
    })
  }
}

function ghost(from: Point, url: string | null, tint = 0x8faec4): Sprite | null {
  if (!url) return null
  const sprite = new Sprite(Texture.from(url))
  sprite.anchor.set(0.5)
  sprite.width = from.w * 1.1
  sprite.height = from.h * 1.1
  sprite.alpha = 0.5
  sprite.tint = tint
  sprite.position.set(from.x, from.y)
  add('front', sprite)
  return sprite
}

function boneChip(at: Point, scale = 1): Graphics {
  const g = new Graphics()
  g.blendMode = 'add'
  g.roundRect(-5 * scale, -2 * scale, 10 * scale, 4 * scale, 1).fill({ color: BONE, alpha: 0.95 })
  g.moveTo(-4 * scale, 0).lineTo(4 * scale, 0).stroke({ width: 1, color: RUNE, alpha: 0.8 })
  g.position.set(at.x, at.y)
  add('front', g)
  return g
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

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  g.circle(0, 0, 5).fill({ color: BLOOD, alpha: 0.95 })
  g.circle(0, 0, 2.2).fill({ color: RUNE, alpha: 0.95 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, RUNE, 4, 14, 0.16, 2)
      g.destroy()
    },
  })
}

function deathStrike(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0x8faec4)
  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    ring({ x: to.x, y: to.y + to.h * 0.4, w: 8, h: 8 }, BLOOD, 10, 22, 0.16, 2)
    if (shade) gsap.to(shade, { y: from.y - 6, duration: 0.12 })
    gsap.to('.battle-center', { scale: 1.02, duration: 0.16 })
  }, 0)
  tl.add(() => {
    const slash = new Graphics()
    slash.blendMode = 'add'
    slash.moveTo(-46, -28).lineTo(48, 32).stroke({ width: 5, color: SOUL, cap: 'round', alpha: 0.55 })
    slash.moveTo(-44, -26).lineTo(46, 30).stroke({ width: 3, color: FLARE, cap: 'round', alpha: 0.95 })
    slash.moveTo(-42, -24).lineTo(44, 28).stroke({ width: 1.6, color: 0xf4f0e4, cap: 'round', alpha: 0.9 })
    slash.position.set(to.x, to.y)
    add('front', slash)
    fadeKill(slash, 0.18)
  }, 0.22)
  tl.add(() => {
    ring(to, BLOOD, 8, 34, 0.18, 2)
    mote(to, BONE, 7, 18)
    mote(to, RUNE, 5, 14)
    punchCard(uid, 'heavy')
    shakeCamera(7, 0.16)
    ctx.onImpact()
  }, 0.38)
  tl.add(() => {
    const orb = new Graphics()
    orb.blendMode = 'add'
    orb.circle(0, 0, 7).fill({ color: BLOOD, alpha: 0.9 })
    orb.circle(0, 0, 11).fill({ color: SOUL, alpha: 0.28 })
    orb.position.set(to.x, to.y)
    add('front', orb)
    gsap.to(orb, { x: from.x, y: from.y, duration: 0.18, ease: 'power2.in' })
    fadeKill(orb, 0.08, 0.16)
  }, 0.46)
  tl.add(() => {
    ring(from, FLARE, 8, 28, 0.2, 2)
    for (let i = 0; i < 3; i++) {
      const chip = boneChip({ x: to.x + (i - 1) * 10, y: to.y + 12, w: 8, h: 8 }, 1)
      gsap.to(chip, { x: from.x + (i - 1) * 14, y: from.y - 6, duration: 0.2, ease: 'power2.out' })
      fadeKill(chip, 0.18, 0.16)
    }
    pearlToSp(to, ctx.side)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    if (shade) fadeKill(shade, 0.16)
    gsap.to('.battle-center', { scale: 1, duration: 0.16 })
  }, 0.66)
  hold(tl, 0.9)
  return tl
}

function antiMagicZone(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const allies = allyHits(ctx)
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: SHADE, alpha: 0.14 })
  overlayLayer?.addChild(veil)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    gsap.to('.battle-center', { scale: 0.98, duration: 0.18 })
  }, 0)
  tl.add(() => {
    allies.forEach((hit, i) => {
      const stone = new Graphics()
      stone.blendMode = 'add'
      stone.roundRect(-5, -8, 10, 16, 2).fill({ color: VEIL, alpha: 0.85 })
      stone.roundRect(-5, -8, 10, 16, 2).stroke({ width: 1.4, color: RUNE, alpha: 0.9 })
      stone.position.set(hit.pt.x, hit.pt.y - 40)
      add('back', stone)
      gsap.to(stone, { y: hit.pt.y + hit.pt.h * 0.42, duration: 0.14, delay: i * 0.03, ease: 'power2.in' })
      fadeKill(stone, 0.28, 0.18)
    })
  }, 0.14)
  tl.add(() => {
    const dome = new Graphics()
    dome.blendMode = 'add'
    const cx = allies.reduce((s, h) => s + h.pt.x, from.x) / (allies.length + 1)
    const cy = allies.reduce((s, h) => s + h.pt.y, from.y) / (allies.length + 1)
    dome.ellipse(0, 18, 120, 58).stroke({ width: 3, color: VEIL, alpha: 0.7 })
    dome.ellipse(0, 18, 108, 50).stroke({ width: 1.6, color: RUNE, alpha: 0.55 })
    dome.position.set(cx, cy)
    add('back', dome)
    fadeKill(dome, 0.5, 0.2)
    for (const hit of allies) {
      ring({ x: hit.pt.x, y: hit.pt.y + hit.pt.h * 0.36, w: 8, h: 8 }, RUNE, 8, 26, 0.22, 2)
      punchCard(hit.uid, 'light')
    }
    stamp('反魔法领域', '#65bce8', 32)
    ctx.onImpact()
  }, 0.36)
  tl.add(() => {
    fadeKill(veil, 0.22)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    gsap.to('.battle-center', { scale: 1, duration: 0.16 })
  }, 0.72)
  hold(tl, 0.88)
  return tl
}

function runeWeapon(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const shade = ghost(from, cardArtUrl(ctx.actorUid), 0x65bce8)
  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: SHADE, alpha: 0.16 })
  overlayLayer?.addChild(veil)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -10, 0.14)
    ring({ x: from.x, y: from.y + from.h * 0.4, w: 8, h: 8 }, RUNE, 12, 36, 0.22, 2)
    if (shade) gsap.to(shade, { x: from.x + 28, duration: 0.2 })
  }, 0)
  tl.add(() => {
    const blade = new Graphics()
    blade.blendMode = 'add'
    blade.moveTo(0, -46).lineTo(8, 36).lineTo(-8, 36).closePath().fill({ color: RUNE, alpha: 0.35 })
    blade.moveTo(0, -46).lineTo(8, 36).lineTo(-8, 36).closePath().stroke({ width: 2, color: FLARE, alpha: 0.8 })
    blade.position.set(from.x + 26, from.y - 8)
    add('front', blade)
    gsap.to(blade, { y: from.y + 6, duration: 0.18, ease: 'power2.out' })
    fadeKill(blade, 0.55, 0.2)
    stamp('符文刃舞', '#65bce8', 34)
  }, 0.22)
  tl.add(() => {
    for (let i = 0; i < 5; i++) {
      const chip = boneChip({ x: from.x, y: from.y + 18, w: 8, h: 8 }, 1.1)
      const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2
      gsap.to(chip, {
        x: from.x + Math.cos(ang) * 28,
        y: from.y + Math.sin(ang) * 16,
        duration: 0.18,
        delay: i * 0.03,
        ease: 'power2.out',
      })
      fadeKill(chip, 0.28, 0.2)
    }
    mote(from, BONE, 10, 22)
    mote(from, RUNE, 6, 16)
    punchCard(ctx.actorUid, 'light')
    shakeCamera(5, 0.14)
    ctx.onImpact()
  }, 0.48)
  tl.add(() => {
    fadeKill(veil, 0.24)
    if (shade) fadeKill(shade, 0.2)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.95)
  hold(tl, 1.22)
  return tl
}

export function playBloodFx(ctx: FxContext): gsap.core.Timeline {
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
      ? deathStrike(ctx, from, to, ctx.targetUid)
      : ctx.skillId === 's1'
        ? antiMagicZone(ctx, from)
        : ctx.skillId === 's3'
          ? runeWeapon(ctx, from)
          : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
