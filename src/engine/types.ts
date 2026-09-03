export type Role = 'tank' | 'healer' | 'dps'
export type Side = 'player' | 'ai'
export type SkillId = 'aa' | 's1' | 's2' | 's3'
export type EffectKind =
  | 'damage'
  | 'aoe'
  | 'heal'
  | 'heal-aoe'
  | 'shield'
  | 'dot'
  | 'stun'
  | 'execute'
  | 'gain-sp'
  | 'infuse'
  | 'stagger'
  | 'guard'
  | 'rooted'
  | 'ascend'
  | 'havoc'
  | 'empower'
  | 'sweep'
  | 'ardent'
  | 'hot'
  | 'innervate'
  | 'kill-command'
  | 'summon-pet'
  | 'bestial-wrath'
  | 'deathstrike'
  | 'amz'
  | 'boneshield'
  | 'rune-weapon'
  | 'missiles'
  | 'prismatic'
  | 'clearcast'
  | 'touch-magi'
  | 'chaos-strike'
  | 'blade-dance'
  | 'eye-beam'
  | 'metamorphosis'
  | 'eruption'
  | 'prescience'
  | 'ebon-might'
  | 'deep-breath'

export type TargetMode = 'enemy' | 'ally' | 'self' | 'all-enemies' | 'all-allies'

export interface SkillEffect {
  kind: EffectKind
  value: number
  extra?: number
}

export interface SkillDef {
  id: SkillId
  name: string
  icon: string
  cost: number
  gainSp?: number
  passive?: boolean
  effect: SkillEffect
  target: TargetMode
  desc: string
}

export interface SpecDef {
  id: string
  classId: string
  className: string
  specName: string
  role: Role
  color: string
  icon: string
  maxHp: number
  speed: number
  atk: number
  crit: number
  critDmg: number
  skills: [SkillDef, SkillDef, SkillDef, SkillDef]
}

export interface Dot {
  dmg: number
  turns: number
}

export interface Hot {
  heal: number
  turns: number
  fromUid: string
  skillName: string
}

export interface Unit {
  uid: string
  specId: string
  side: Side
  hp: number
  maxHp: number
  speed: number
  atk: number
  crit: number
  critDmg: number
  shield: number
  stunned: boolean
  acted: boolean
  dots: Dot[]
  hots: Hot[]
  hasStagger: boolean
  stagger: number[]
  dmgAmp: number
  dmgAmpTurns: number
  takenAmp: number
  takenAmpTurns: number
  healTakenPct: number
  executeFree: boolean
  guardTurns: number
  pistolLoaded: boolean
  eleOverloadTurns: number
  chaosStacks: number
  havocUid: string | null
  priorityAct: boolean
  ardentPct: number
  freeSkill: boolean
  isPet: boolean
  ownerUid: string | null
  boneShield: number
  takenReducePct: number
  takenReduceTurns: number
  runeWeaponTurns: number
  clearcast: number
  magiFromUid: string | null
  magiTurns: number
  magiStored: number
  metaTurns: number
  ebonAtkPct: number
  ebonTurns: number
  nextTakenAmp: number
  skinId: string
}

export interface BattleState {
  units: Unit[]
  queue: string[]
  turn: Side
  round: number
  playerSp: number
  aiSp: number
  maxSp: number
  log: string[]
  winner: Side | null
}

export const TEAM_MAX_SP = 8
export const TEAM_START_SP = 3
export const DEFAULT_CRIT = 20
export const DEFAULT_CRIT_DMG = 150

export function wowIcon(name: string, size: 'large' | 'medium' = 'large'): string {
  return `https://wow.zamimg.com/images/wow/icons/${size}/${name.toLowerCase()}.jpg`
}

export function targetOf(kind: EffectKind): TargetMode {
  switch (kind) {
    case 'aoe':
    case 'ascend':
    case 'blade-dance':
    case 'deep-breath':
      return 'all-enemies'
    case 'heal-aoe':
    case 'ebon-might':
      return 'all-allies'
    case 'heal':
    case 'shield':
    case 'infuse':
    case 'empower':
    case 'hot':
    case 'innervate':
      return 'ally'
    case 'gain-sp':
    case 'stagger':
    case 'guard':
    case 'rooted':
    case 'sweep':
    case 'ardent':
    case 'summon-pet':
    case 'bestial-wrath':
    case 'amz':
    case 'boneshield':
    case 'rune-weapon':
    case 'clearcast':
    case 'prescience':
      return 'self'
    default:
      return 'enemy'
  }
}
