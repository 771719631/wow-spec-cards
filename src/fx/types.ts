import type { Side, SkillId } from '../engine/types'

export interface Point {
  x: number
  y: number
  w: number
  h: number
}

export interface FxContext {
  specId: string
  skillId: SkillId
  actorUid: string
  targetUid: string | null
  targetUids?: string[]
  procAscend?: boolean
  procSweep?: boolean
  sweepUid?: string | null
  executeLow?: boolean
  executeKill?: boolean
  chaosStacks?: number
  havocUid?: string | null
  petUids?: string[]
  summonedUid?: string | null
  extraUids?: string[]
  metaForm?: boolean
  ebonExtend?: boolean
  side: Side
  timeScale: number
  paused: boolean
  onImpact: () => void
}
