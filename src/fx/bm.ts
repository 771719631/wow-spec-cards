import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import { cardEl, cardPoint, dimCard, liftCard, punchCard, settleCard, shakeCamera } from './camera'
import { backLayer, frontLayer, overlayLayer } from './stage'
import type { FxContext, Point } from './types'

const HUNTER = 0x77b94e
const DEEP = 0x2e7d4b
const IVORY = 0xe7dfc2
const COMMAND = 0xb33a2e
const AMBER = 0xd8a23a
const PURPLE = 0x67429a
const WOLF = 0x8cb7cc
const DINO = 0xa87935

type PetKind = 'dino' | 'wolf' | 'cat'

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

function stamp(text: string, color: string, size = 34): HTMLElement {
  const el = document.createElement('div')
  el.className = 'fx-stamp'
  el.textContent = text
  el.style.color = color
  el.style.fontSize = `${size}px`
  el.style.textShadow = '0 0 14px #000, 0 0 16px #b33a2e'
  document.body.appendChild(el)
  gsap.to(el, {
    opacity: 0,
    duration: 0.22,
    delay: 0.32,
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
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.35
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

function petKind(uid: string): PetKind {
  const spec = cardEl(uid)?.dataset.spec
  if (spec === 'pet-devilsaur') return 'dino'
  if (spec === 'pet-nightsaber') return 'cat'
  return 'wolf'
}

function petColor(kind: PetKind): number {
  if (kind === 'dino') return DINO
  if (kind === 'cat') return PURPLE
  return WOLF
}

function livingPets(ctx: FxContext): { uid: string; pt: Point; kind: PetKind }[] {
  const ids =
    ctx.petUids?.length
      ? ctx.petUids
      : [...document.querySelectorAll<HTMLElement>(`.battle-card.is-pet.${ctx.side}:not(.is-dead)`)]
          .map((el) => el.dataset.uid)
          .filter((uid): uid is string => Boolean(uid))
  return ids
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt, kind: petKind(uid) } : null
    })
    .filter((x): x is { uid: string; pt: Point; kind: PetKind } => Boolean(x))
}

function pearlToSp(from: Point, side: FxContext['side']): void {
  const host = document.querySelector<HTMLElement>(`.team-sp.${side} .sp-row`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const g = new Graphics()
  g.blendMode = 'add'
  g.moveTo(0, -7).lineTo(4, 6).lineTo(-4, 6).closePath().fill({ color: AMBER, alpha: 0.95 })
  g.position.set(from.x, from.y)
  add('front', g)
  gsap.to(g, {
    x: r.left + r.width * 0.72,
    y: r.top + r.height / 2,
    rotation: 2.2,
    duration: 0.26,
    ease: 'power2.in',
    onComplete: () => {
      ring({ x: g.x, y: g.y, w: 8, h: 8 }, HUNTER, 4, 14, 0.16, 2)
      g.destroy()
    },
  })
}

function cobraShot(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const pets = livingPets(ctx)
  const bolt = new Graphics()
  bolt.blendMode = 'add'
  bolt.moveTo(-18, 0).lineTo(16, 0).stroke({ width: 3.2, color: IVORY, cap: 'round', alpha: 0.95 })
  bolt.moveTo(-18, 0).lineTo(16, 0).stroke({ width: 7, color: HUNTER, cap: 'round', alpha: 0.4 })
  bolt.moveTo(10, -7).quadraticCurveTo(22, 0, 10, 7).stroke({ width: 2.2, color: DEEP, alpha: 0.95 })
  bolt.circle(18, -4, 2.2).fill({ color: HUNTER, alpha: 0.95 })
  bolt.circle(18, 4, 2.2).fill({ color: HUNTER, alpha: 0.95 })
  bolt.position.set(from.x, from.y)
  add('front', bolt)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.1)
    ring({ x: to.x, y: to.y + to.h * 0.4, w: 8, h: 8 }, HUNTER, 10, 22, 0.16, 2)
    for (const pet of pets) liftCard(pet.uid, -4, 0.1)
  }, 0)
  tl.add(() => {
    const ang = Math.atan2(to.y - from.y, to.x - from.x)
    bolt.rotation = ang
    gsap.to(bolt, {
      x: to.x,
      y: to.y,
      duration: 0.16,
      ease: 'power2.in',
      onUpdate: () => {
        bolt.rotation = ang + Math.sin(gsap.globalTimeline.time() * 28) * 0.12
      },
    })
    mote(from, HUNTER, 5, 12)
  }, 0.12)
  tl.add(() => {
    fadeKill(bolt, 0.08)
    const fangs = new Graphics()
    fangs.blendMode = 'add'
    fangs.moveTo(-10, -8).lineTo(0, 2).lineTo(-4, -12).stroke({ width: 2.4, color: IVORY, cap: 'round', alpha: 0.95 })
    fangs.moveTo(10, -8).lineTo(0, 2).lineTo(4, -12).stroke({ width: 2.4, color: IVORY, cap: 'round', alpha: 0.95 })
    fangs.position.set(to.x, to.y)
    add('front', fangs)
    fadeKill(fangs, 0.18)
    ring(to, HUNTER, 8, 32, 0.18, 2)
    mote(to, DEEP, 7, 16)
    punchCard(uid, 'light')
    shakeCamera(2.5, 0.1)
    ctx.onImpact()
  }, 0.3)
  tl.add(() => {
    pearlToSp(to, ctx.side)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    for (const pet of pets) settleCard(pet.uid)
  }, 0.42)
  hold(tl, 0.6)
  return tl
}

function claws(at: Point, color: number, count = 3): void {
  const g = new Graphics()
  g.blendMode = 'add'
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 8
    g.moveTo(x - 10, -16).lineTo(x + 8, 14).stroke({ width: 2.4, color, cap: 'round', alpha: 0.95 })
  }
  g.position.set(at.x, at.y)
  add('front', g)
  fadeKill(g, 0.18)
}

function killCommand(ctx: FxContext, from: Point, to: Point, uid: string): gsap.core.Timeline {
  const tl = gsap.timeline()
  const pets = livingPets(ctx)
  const mark = new Graphics()
  mark.blendMode = 'add'
  mark.moveTo(-14, -10).lineTo(4, 12).stroke({ width: 3, color: COMMAND, cap: 'round', alpha: 0.95 })
  mark.moveTo(-4, -14).lineTo(12, 10).stroke({ width: 3, color: COMMAND, cap: 'round', alpha: 0.95 })
  mark.moveTo(8, -12).lineTo(16, 6).stroke({ width: 3, color: AMBER, cap: 'round', alpha: 0.85 })
  mark.circle(0, 0, 22).stroke({ width: 2, color: AMBER, alpha: 0.7 })
  mark.position.set(to.x, to.y - to.h * 0.08)
  add('front', mark)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -10, 0.12)
    stamp('杀戮命令', '#d8a23a', 36)
    for (const pet of pets) {
      const line = new Graphics()
      line.blendMode = 'add'
      line.moveTo(from.x, from.y).lineTo(pet.pt.x, pet.pt.y).stroke({
        width: 2,
        color: AMBER,
        alpha: 0.55,
      })
      add('back', line)
      fadeKill(line, 0.22, 0.08)
      liftCard(pet.uid, -6, 0.1)
    }
  }, 0)

  pets.forEach((pet, i) => {
    const t = 0.2 + i * 0.1
    tl.add(() => strikePet(pet, to, uid, i === 0 ? ctx : null), t)
  })
  if (pets.length === 0) {
    tl.add(() => ctx.onImpact(), 0.22)
  }

  const done = 0.2 + Math.max(1, pets.length) * 0.1 + 0.22
  tl.add(() => {
    fadeKill(mark, 0.16)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    for (const pet of pets) settleCard(pet.uid)
  }, done)
  hold(tl, done + 0.16)
  return tl
}

function strikePet(
  pet: { uid: string; pt: Point; kind: PetKind },
  to: Point,
  targetUid: string,
  ctx: FxContext | null,
): void {
  if (pet.kind === 'dino') {
    const body = new Graphics()
    body.blendMode = 'add'
    body.roundRect(-16, -10, 32, 20, 6).fill({ color: DINO, alpha: 0.7 })
    body.position.set(pet.pt.x, pet.pt.y)
    add('front', body)
    gsap.to(body, { x: to.x, y: to.y, duration: 0.1, ease: 'power3.in' })
    fadeKill(body, 0.12, 0.1)
    ring(to, DINO, 10, 36, 0.18, 3)
    mote(to, AMBER, 7, 16)
    punchCard(targetUid, 'heavy')
    shakeCamera(6, 0.14)
  } else if (pet.kind === 'wolf') {
    const dash = new Graphics()
    dash.blendMode = 'add'
    dash.moveTo(pet.pt.x, pet.pt.y)
      .quadraticCurveTo((pet.pt.x + to.x) / 2, Math.min(pet.pt.y, to.y) - 28, to.x, to.y)
      .stroke({ width: 4, color: WOLF, cap: 'round', alpha: 0.8 })
    add('front', dash)
    fadeKill(dash, 0.16)
    claws(to, IVORY, 2)
    punchCard(targetUid, 'light')
    shakeCamera(3, 0.1)
  } else {
    ring(pet.pt, PURPLE, 6, 18, 0.12, 2)
    const rift = new Graphics()
    rift.blendMode = 'add'
    rift.moveTo(to.x + 18, to.y - 22).lineTo(to.x + 22, to.y + 18).stroke({
      width: 4,
      color: PURPLE,
      cap: 'round',
      alpha: 0.9,
    })
    add('front', rift)
    fadeKill(rift, 0.16)
    claws({ ...to, x: to.x + 8 }, PURPLE, 3)
    punchCard(targetUid, 'light')
  }
  if (ctx) ctx.onImpact()
}

function summonCompanion(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const uid = ctx.summonedUid
  const dest = uid ? cardPoint(uid) : null
  const kind = uid ? petKind(uid) : 'wolf'
  const prints: Array<{ kind: PetKind; color: number; draw: (g: Graphics) => void }> = [
    {
      kind: 'dino',
      color: DINO,
      draw: (g) => {
        g.ellipse(0, 4, 10, 14).stroke({ width: 2, color: DINO, alpha: 0.95 })
        g.moveTo(-8, -8).lineTo(-12, -18).moveTo(8, -8).lineTo(12, -18).stroke({
          width: 2,
          color: DINO,
          cap: 'round',
          alpha: 0.95,
        })
      },
    },
    {
      kind: 'wolf',
      color: WOLF,
      draw: (g) => {
        g.ellipse(0, 6, 8, 10).stroke({ width: 2, color: WOLF, alpha: 0.95 })
        for (const [x, y] of [
          [-8, -6],
          [-2, -10],
          [4, -10],
          [10, -5],
        ] as const) {
          g.circle(x, y, 2.2).fill({ color: WOLF, alpha: 0.9 })
        }
      },
    },
    {
      kind: 'cat',
      color: PURPLE,
      draw: (g) => {
        g.ellipse(0, 6, 9, 8).stroke({ width: 2, color: PURPLE, alpha: 0.95 })
        g.ellipse(-8, -4, 3, 4).stroke({ width: 1.6, color: PURPLE, alpha: 0.9 })
        g.ellipse(8, -4, 3, 4).stroke({ width: 1.6, color: PURPLE, alpha: 0.9 })
      },
    },
  ]

  const nodes = prints.map((p, i) => {
    const g = new Graphics()
    g.blendMode = 'add'
    p.draw(g)
    g.position.set(from.x + (i - 1) * 42, from.y + 36)
    g.alpha = 0.28
    add('front', g)
    return g
  })

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -8, 0.12)
    const seal = new Graphics()
    seal.blendMode = 'add'
    seal.circle(0, 0, 28).stroke({ width: 2.2, color: AMBER, alpha: 0.8 })
    seal.circle(0, 0, 16).stroke({ width: 1.4, color: HUNTER, alpha: 0.7 })
    seal.position.set(from.x, from.y + from.h * 0.38)
    add('back', seal)
    fadeKill(seal, 0.8, 0.2)
  }, 0)

  ;[0, 1, 2, 0, 1, 2].forEach((idx, step) => {
    tl.add(() => {
      nodes.forEach((n, i) => {
        n.alpha = i === idx ? 1 : 0.22
        n.scale.set(i === idx ? 1.15 : 1)
      })
    }, 0.14 + step * 0.06)
  })

  const winner = prints.findIndex((p) => p.kind === kind)
  tl.add(() => {
    nodes.forEach((n, i) => {
      n.alpha = i === winner ? 1 : 0.12
    })
    const names = { dino: '恐龙', wolf: '狼', cat: '暗夜豹' }
    stamp(`动物伙伴\n${names[kind]}`, kind === 'cat' ? '#c9b4ee' : kind === 'dino' ? '#d8a23a' : '#8cb7cc', 30)
  }, 0.52)
  tl.add(() => {
    if (dest) landPet(kind, dest, uid ?? undefined)
    ctx.onImpact()
    nodes.forEach((n) => fadeKill(n, 0.2))
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
  }, 0.78)
  hold(tl, 1.12)
  return tl
}

function landPet(kind: PetKind, dest: Point, uid: string | undefined): void {
  if (kind === 'dino') {
    mote({ ...dest, y: dest.y + dest.h * 0.3 }, DINO, 10, 22)
    ring({ x: dest.x, y: dest.y + dest.h * 0.42, w: 8, h: 8 }, DINO, 10, 36, 0.22, 3)
    if (uid) punchCard(uid, 'heavy')
    shakeCamera(7, 0.16)
  } else if (kind === 'wolf') {
    const mist = new Graphics()
    mist.blendMode = 'add'
    mist.ellipse(0, 8, 34, 12).fill({ color: WOLF, alpha: 0.4 })
    mist.position.set(dest.x - 40, dest.y)
    add('front', mist)
    gsap.to(mist, { x: dest.x, duration: 0.2, ease: 'power2.out' })
    fadeKill(mist, 0.22, 0.08)
    if (uid) punchCard(uid, 'light')
  } else {
    const rift = new Graphics()
    rift.blendMode = 'add'
    rift.moveTo(0, -24).lineTo(0, 22).stroke({ width: 5, color: PURPLE, cap: 'round', alpha: 0.9 })
    rift.circle(-6, -8, 3).fill({ color: 0xc9b4ee, alpha: 0.95 })
    rift.circle(6, -8, 3).fill({ color: 0xc9b4ee, alpha: 0.95 })
    rift.position.set(dest.x, dest.y)
    add('front', rift)
    fadeKill(rift, 0.28)
    mote(dest, PURPLE, 8, 16)
    if (uid) punchCard(uid, 'light')
  }
}

function bestialWrath(ctx: FxContext, from: Point): gsap.core.Timeline {
  const tl = gsap.timeline()
  const pets = livingPets(ctx)
  const foes = [...document.querySelectorAll<HTMLElement>(`.battle-card.${ctx.side === 'player' ? 'ai' : 'player'}:not(.is-dead)`)]
    .map((el) => el.dataset.uid)
    .filter((uid): uid is string => Boolean(uid))
    .map((uid) => {
      const pt = cardPoint(uid)
      return pt ? { uid, pt } : null
    })
    .filter((x): x is { uid: string; pt: Point } => Boolean(x))

  const veil = new Graphics()
  veil.rect(0, 0, window.innerWidth, window.innerHeight).fill({ color: 0x1a0c08, alpha: 0.14 })
  overlayLayer?.addChild(veil)

  tl.add(() => {
    dimCard(ctx.actorUid, true)
    liftCard(ctx.actorUid, -10, 0.12)
    ring(from, COMMAND, 12, 48, 0.24, 3)
    mote(from, AMBER, 10, 22)
    for (const pet of pets) {
      ring(pet.pt, petColor(pet.kind), 8, 28, 0.2, 2)
      liftCard(pet.uid, -6, 0.1)
    }
    stamp('狂野怒火', '#d8a23a', 36)
  }, 0)

  pets.forEach((pet, i) => {
    tl.add(() => {
      if (i === 0) ctx.onImpact()
      ring(pet.pt, petColor(pet.kind), 10, 42, 0.2, 3)
      for (const foe of foes) {
        punchCard(foe.uid, pet.kind === 'dino' ? 'heavy' : 'light')
        mote(foe.pt, petColor(pet.kind), 4, 12)
      }
      if (pet.kind === 'dino') shakeCamera(5, 0.12)
    }, 0.28 + i * 0.09)
  })
  if (pets.length === 0) {
    tl.add(() => ctx.onImpact(), 0.28)
  }

  const done = 0.28 + Math.max(1, pets.length) * 0.09 + 0.18
  tl.add(() => {
    fadeKill(veil, 0.2)
    dimCard(ctx.actorUid, false)
    settleCard(ctx.actorUid)
    for (const pet of pets) settleCard(pet.uid)
  }, done)
  hold(tl, done + 0.12)
  return tl
}

export function playBmFx(ctx: FxContext): gsap.core.Timeline {
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
      ? cobraShot(ctx, from, to, ctx.targetUid)
      : ctx.skillId === 's1' && to && ctx.targetUid
        ? killCommand(ctx, from, to, ctx.targetUid)
        : ctx.skillId === 's2'
          ? summonCompanion(ctx, from)
          : ctx.skillId === 's3'
            ? bestialWrath(ctx, from)
            : fail
  if (tl === fail) fail.add(() => ctx.onImpact())
  tl.timeScale(ctx.timeScale)
  return tl
}
