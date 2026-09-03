import gsap from 'gsap'
import type { Point } from './types'

export function cardPoint(uid: string): Point | null {
  const el = document.querySelector<HTMLElement>(`[data-uid="${uid}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }
}

export function cardArtUrl(uid: string): string | null {
  const host = document.querySelector<HTMLElement>(`[data-uid="${uid}"]`)
  if (!host) return null
  const video = host.querySelector<HTMLVideoElement>('video.wow-icon')
  if (video) return video.poster || video.currentSrc || video.src || null
  const img = host.querySelector<HTMLImageElement>('img.wow-icon')
  return img?.currentSrc || img?.src || null
}

export function cardEl(uid: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-uid="${uid}"]`)
}

export function shakeCamera(px: number, duration = 0.22): gsap.core.Tween {
  const stage = document.querySelector<HTMLElement>('.battle-center')
  if (!stage) return gsap.to({}, { duration: 0 })
  const amt = Math.max(0, px)
  let dir = 1
  gsap.set(stage, { x: 0, y: 0 })
  return gsap.to(stage, {
    duration: Math.max(0.04, duration / 5),
    x: () => {
      dir *= -1
      return dir * amt
    },
    y: () => (Math.random() - 0.5) * amt * 0.55,
    repeat: 4,
    yoyo: true,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.set(stage, { x: 0, y: 0 })
    },
  })
}

export function punchCard(uid: string, kind: 'light' | 'heavy' | 'crit'): gsap.core.Timeline {
  const el = cardEl(uid)
  if (!el) return gsap.timeline()
  if (kind === 'crit') {
    return gsap
      .timeline()
      .to(el, { x: 12, y: 8, rotation: 5, filter: 'brightness(1.85) saturate(1.35)', duration: 0.06 })
      .to(el, { x: -9, y: 10, rotation: -4, duration: 0.08 })
      .to(el, { x: 0, y: 0, rotation: 0, filter: 'none', duration: 0.2 })
  }
  if (kind === 'heavy') {
    return gsap
      .timeline()
      .to(el, { x: 8, y: 5, rotation: 3, duration: 0.07 })
      .to(el, { x: 0, y: 0, rotation: 0, duration: 0.16 })
  }
  return gsap
    .timeline()
    .to(el, { x: 5, duration: 0.05 })
    .to(el, { x: -4, duration: 0.05 })
    .to(el, { x: 0, duration: 0.08 })
}

export function swayCard(uid: string): gsap.core.Timeline {
  const el = cardEl(uid)
  if (!el) return gsap.timeline()
  return gsap
    .timeline()
    .to(el, { rotation: -7, x: -8, duration: 0.1, ease: 'power2.out' })
    .to(el, { rotation: 5, x: 6, duration: 0.12 })
    .to(el, { rotation: 0, x: 0, duration: 0.16, ease: 'power2.out' })
}

export function liftCard(uid: string, y = -10, duration = 0.15): gsap.core.Tween {
  const el = cardEl(uid)
  if (!el) return gsap.to({}, { duration: 0 })
  return gsap.to(el, { y, duration, ease: 'power2.out' })
}

export function settleCard(uid: string, duration = 0.18): gsap.core.Tween {
  const el = cardEl(uid)
  if (!el) return gsap.to({}, { duration: 0 })
  return gsap.to(el, { y: 0, x: 0, rotation: 0, duration, ease: 'power2.out' })
}

export function dimCard(uid: string, on: boolean): void {
  const el = cardEl(uid)
  if (!el) return
  gsap.to(el, { filter: on ? 'brightness(0.42)' : 'none', duration: 0.1 })
}

export function setCasting(on: boolean): void {
  document.querySelector('.battle-screen')?.classList.toggle('is-casting', on)
}
