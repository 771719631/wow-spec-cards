import type { SkillId } from '../engine/types'
import { DEFAULT_CRIT, DEFAULT_CRIT_DMG, TEAM_MAX_SP, TEAM_START_SP } from '../engine/types'

const KEY = 'wow-admin-config'

export interface SkillPatch {
  name?: string
  icon?: string
  cost?: number
  gainSp?: number | null
  cooldown?: number
  value?: number
  extra?: number
  desc?: string
  sound?: string
  fx?: string
}

export interface SpecPatch {
  maxHp?: number
  speed?: number
  atk?: number
  crit?: number
  critDmg?: number
  skills?: Partial<Record<SkillId, SkillPatch>>
}

export interface BattlePatch {
  maxSp?: number
  startSp?: number
  defaultCrit?: number
  defaultCritDmg?: number
}

export interface AdminConfig {
  specs: Record<string, SpecPatch>
  battle: BattlePatch
}

const empty = (): AdminConfig => ({ specs: {}, battle: {} })

export function loadConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as AdminConfig
    return {
      specs: parsed.specs ?? {},
      battle: parsed.battle ?? {},
    }
  } catch {
    return empty()
  }
}

export function saveConfig(cfg: AdminConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function specPatch(id: string): SpecPatch | undefined {
  return loadConfig().specs[id]
}

export function skillPatch(specId: string, skillId: SkillId): SkillPatch | undefined {
  return specPatch(specId)?.skills?.[skillId]
}

export function battleParams(): { maxSp: number; startSp: number; defaultCrit: number; defaultCritDmg: number } {
  const b = loadConfig().battle
  return {
    maxSp: b.maxSp ?? TEAM_MAX_SP,
    startSp: b.startSp ?? TEAM_START_SP,
    defaultCrit: b.defaultCrit ?? DEFAULT_CRIT,
    defaultCritDmg: b.defaultCritDmg ?? DEFAULT_CRIT_DMG,
  }
}

export function patchSpec(id: string, patch: SpecPatch): void {
  const cfg = loadConfig()
  cfg.specs[id] = { ...cfg.specs[id], ...patch }
  saveConfig(cfg)
}

export function patchSkill(specId: string, skillId: SkillId, patch: SkillPatch): void {
  const cfg = loadConfig()
  const spec = cfg.specs[specId] ?? {}
  const skills = { ...(spec.skills ?? {}) }
  skills[skillId] = { ...skills[skillId], ...patch }
  cfg.specs[specId] = { ...spec, skills }
  saveConfig(cfg)
}

export function patchBattle(patch: BattlePatch): void {
  const cfg = loadConfig()
  cfg.battle = { ...cfg.battle, ...patch }
  saveConfig(cfg)
}

export function resetSpec(id: string): void {
  const cfg = loadConfig()
  delete cfg.specs[id]
  saveConfig(cfg)
}

export function resetAll(): void {
  localStorage.removeItem(KEY)
}

export const SPEC_FX: Record<string, string> = {
  'rogue-outlaw': 'outlaw',
  'monk-brew': 'brew',
  'shaman-ele': 'ele',
  'priest-holy': 'priest',
  'warlock-destro': 'destro',
  'warrior-arms': 'arms',
  'paladin-prot': 'prot',
  'druid-resto': 'resto',
  'hunter-bm': 'bm',
  'dk-blood': 'blood',
  'mage-arcane': 'arcane',
  'dh-havoc': 'havoc',
  'evoker-aug': 'aug',
}

export const FX_OPTIONS = [
  'generic',
  'outlaw',
  'brew',
  'ele',
  'priest',
  'destro',
  'arms',
  'prot',
  'resto',
  'bm',
  'blood',
  'arcane',
  'havoc',
  'aug',
] as const

export function fxFor(specId: string, skillId: SkillId = 'aa'): string {
  return skillPatch(specId, skillId)?.fx || SPEC_FX[specId] || 'generic'
}
