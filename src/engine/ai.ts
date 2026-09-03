import { getSpec, HAVOC_META_BLADE_PCT, HAVOC_META_CHAOS_PCT, SPECS } from '../data/specs'
import { canUseSkill, currentActor, living, opposite, petsOf, teamSp, validTargets } from './battle'
import type { BattleState, SkillDef, SkillId, Unit } from './types'

export function aiPickDraft(): string[] {
  const tanks = shuffle(SPECS.filter((s) => s.role === 'tank'))
  const healers = shuffle(SPECS.filter((s) => s.role === 'healer'))
  const dps = shuffle(SPECS.filter((s) => s.role === 'dps'))
  const picks: string[] = []
  if (tanks[0]) picks.push(tanks[0].id)
  if (healers[0]) picks.push(healers[0].id)
  for (const spec of dps) {
    if (picks.length >= 5) break
    picks.push(spec.id)
  }
  while (picks.length < 5) {
    const leftover = SPECS.find((s) => !picks.includes(s.id))
    if (!leftover) break
    picks.push(leftover.id)
  }
  return picks
}

export interface AiAction {
  actorUid: string
  skillId: SkillId
  targetUid: string | null
}

export function aiPickAction(state: BattleState): AiAction | null {
  const actor = currentActor(state)
  if (!actor || actor.side !== 'ai') return null
  return pickAction(state)
}

export function pickAction(state: BattleState): AiAction | null {
  const actor = currentActor(state)
  if (!actor) return null

  const mine = actor.side
  const foes = opposite(mine)
  const wounded = living(state.units, mine)
    .filter((u) => u.hp / u.maxHp < 0.6)
    .sort((a, b) => Number(a.isPet) - Number(b.isPet) || a.hp / a.maxHp - b.hp / b.maxHp)
  const enemies = living(state.units, foes).slice().sort((a, b) => a.hp - b.hp)
  if (enemies.length === 0) return null

  const spec = getSpec(actor.specId)
  if (spec.role === 'healer' && wounded.length > 0) {
    const healSkill = bestAffordable(state, actor, (s) => s.effect.kind === 'heal' || s.effect.kind === 'heal-aoe' || s.effect.kind === 'hot')
    if (healSkill) {
      const target = healSkill.target === 'all-allies' ? null : wounded[0].uid
      return { actorUid: actor.uid, skillId: healSkill.id, targetUid: target }
    }
  }

  if (spec.role === 'tank') {
    const allies = living(state.units, mine)
    const guard = bestAffordable(state, actor, (s) => s.effect.kind === 'guard')
    if (guard && wounded.length > 0) {
      return { actorUid: actor.uid, skillId: guard.id, targetUid: actor.uid }
    }
    const infuse = bestAffordable(state, actor, (s) => s.effect.kind === 'infuse')
    if (infuse) {
      const dps = allies
        .filter((u) => getSpec(u.specId).role === 'dps')
        .sort((a, b) => a.hp - b.hp)
      const target = wounded[0] ?? dps[0] ?? allies[0]
      if (target) return { actorUid: actor.uid, skillId: infuse.id, targetUid: target.uid }
    }
  }

  const sp = teamSp(state, mine)
  if (sp <= 1) {
    const gen = bestAffordable(state, actor, (s) => s.effect.kind === 'gain-sp')
    if (gen) return { actorUid: actor.uid, skillId: gen.id, targetUid: actor.uid }
  }

  const scored: { skill: SkillDef; target: Unit | null; score: number }[] = []
  for (const skill of spec.skills) {
    if (!canUseSkill(state, actor, skill)) continue
    const targets = needsPick(skill) ? validTargets(state, actor, skill) : [null]
    for (const target of targets) {
      scored.push({ skill, target, score: scoreAction(state, actor, skill, target, enemies, wounded) })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  if (best) return { actorUid: actor.uid, skillId: best.skill.id, targetUid: best.target?.uid ?? null }

  const aa = spec.skills.find((s) => s.id === 'aa')
  if (aa && canUseSkill(state, actor, aa)) {
    return { actorUid: actor.uid, skillId: 'aa', targetUid: enemies[0]?.uid ?? null }
  }
  return null
}

function needsPick(skill: SkillDef): boolean {
  return skill.target === 'enemy' || skill.target === 'ally' || skill.target === 'self'
}

function bestAffordable(
  state: BattleState,
  unit: Unit,
  pred: (s: SkillDef) => boolean,
): SkillDef | null {
  const spec = getSpec(unit.specId)
  const opts = spec.skills.filter((s) => pred(s) && canUseSkill(state, unit, s))
  opts.sort((a, b) => b.effect.value - a.effect.value)
  return opts[0] ?? null
}

function scoreAction(
  state: BattleState,
  actor: Unit,
  skill: SkillDef,
  target: Unit | null,
  enemies: Unit[],
  wounded: Unit[],
): number {
  const { kind, value, extra } = skill.effect
  let score = value
  if (kind === 'execute' && target && target.hp / target.maxHp < 0.35) score += (extra ?? 0) + 20
  if (kind === 'execute' && target && target.hp <= value + (extra ?? 0)) score += 50
  if (kind === 'damage' && target && target.hp <= value) score += 40
  if (kind === 'aoe') {
    const hits = extra != null && extra >= 2 && extra <= 6 ? extra : 1
    score = value * hits * Math.max(1, enemies.length) * 0.7
  }
  if (kind === 'ascend') {
    score = actor.eleOverloadTurns > 0 ? -99 : value * Math.max(1, enemies.length) * 0.75 + 20
  }
  if (kind === 'havoc') {
    if (enemies.length < 2) score = -24
    else if (target && target.uid === actor.havocUid) score = -18
    else score = 26
  }
  if (kind === 'heal' || kind === 'heal-aoe' || kind === 'hot') {
    if (wounded.length === 0) score -= 30
    else score += 10
    if (kind === 'hot' && target && target.hots.some((h) => h.skillName === skill.name)) score -= 14
  }
  if (kind === 'innervate') {
    if (!target || target.freeSkill) score = -20
    else {
      score = 24
      if (getSpec(target.specId).role === 'dps') score += 10
      if (getSpec(target.specId).role === 'healer') score -= 4
    }
  }
  if (kind === 'gain-sp') {
    const sp = teamSp(state, actor.side)
    score = sp >= state.maxSp - 1 ? -20 : (state.maxSp - sp) * 8
  }
  if (kind === 'infuse') {
    score = 28
    if (target && target.hp / target.maxHp < 0.7) score += 12
    if (target && getSpec(target.specId).role === 'dps') score += 8
    if (target && target.dmgAmpTurns > 0) score -= 16
  }
  if (kind === 'empower') {
    score = 30
    if (target && getSpec(target.specId).role === 'dps') score += 14
    if (target && target.priorityAct) score -= 22
    if (wounded.length > 1) score -= 8
  }
  if (kind === 'stagger' || kind === 'rooted' || kind === 'sweep' || kind === 'boneshield' || kind === 'clearcast' || kind === 'prescience') score = -99
  if (kind === 'missiles') {
    const waves = extra ?? 5
    score = value * waves + actor.clearcast * value * waves * 0.85
  }
  if (kind === 'prismatic') {
    score = value + (actor.clearcast >= clearcastMax(actor) ? 4 : 16)
  }
  if (kind === 'touch-magi') {
    score = (target && target.magiFromUid === actor.uid ? 8 : 34) + value * 0.35
    if (enemies.length >= 3) score += 10
  }
  if (kind === 'chaos-strike') {
    const hits = extra ?? 2
    const pct = actor.metaTurns > 0 ? HAVOC_META_CHAOS_PCT : value
    score = pct * hits
  }
  if (kind === 'blade-dance') {
    const hits = extra ?? 3
    const pct = actor.metaTurns > 0 ? HAVOC_META_BLADE_PCT : value
    score = pct * hits * Math.max(1, enemies.length * 0.85)
  }
  if (kind === 'eye-beam') {
    const hits = extra ?? 3
    score = value * hits
    if (actor.hp / actor.maxHp < 0.7) score += 14
  }
  if (kind === 'metamorphosis') {
    score = actor.metaTurns > 0 ? -99 : 42
    if (enemies.length >= 3) score += 8
  }
  if (kind === 'eruption') {
    score = value
    if (living(state.units, actor.side).some((u) => u.ebonTurns > 0)) score += 16
  }
  if (kind === 'ebon-might') {
    const pack = living(state.units, actor.side)
    const left = Math.max(0, ...pack.map((u) => u.ebonTurns))
    score = left >= 2 ? 8 : 38 + pack.length * 4
  }
  if (kind === 'deep-breath') {
    score = value * Math.max(1, enemies.length) + 22
    if (enemies.some((u) => u.nextTakenAmp > 0)) score -= 10
  }
  if (kind === 'deathstrike') score = value + Math.round((1 - actor.hp / Math.max(1, actor.maxHp)) * 40)
  if (kind === 'amz') {
    const pack = living(state.units, actor.side)
    score = pack.some((u) => u.takenReduceTurns > 0) ? 8 : 22 + pack.length * 4
  }
  if (kind === 'rune-weapon') {
    score = actor.runeWeaponTurns > 0 ? -12 : 36
    if (actor.boneShield < 4) score += 8
    if (actor.hp / actor.maxHp < 0.55) score += 6
  }
  if (kind === 'ardent') score = actor.ardentPct > 0 ? -99 : 34
  if (kind === 'shield' && actor.hp / actor.maxHp > 0.7 && target?.uid === actor.uid) score -= 8
  if (kind === 'stun') score += 12
  if (kind === 'kill-command') {
    const pack = petsOf(state.units, actor.uid).length
    score = pack <= 0 ? -99 : value * pack + pack * 8
  }
  if (kind === 'summon-pet') {
    const pack = petsOf(state.units, actor.uid).length
    score = pack <= 0 ? 42 : pack >= (value || 3) ? -99 : 28 - pack * 8
  }
  if (kind === 'bestial-wrath') {
    const pack = petsOf(state.units, actor.uid).length
    score = pack <= 0 ? -99 : 16 + pack * 18
    if (actor.dmgAmp >= (extra ?? 20)) score -= 12
  }
  if (target && target.side === opposite(actor.side)) score += (1 - target.hp / target.maxHp) * 8
  if (target?.isPet) score -= 6
  if (skill.id === 's3') score += 4
  if (skill.id === 'aa') score += 1
  if (actor.specId === 'warlock-destro' && skill.id === 's1') {
    score = Math.round(value * (1 + actor.chaosStacks * 0.2))
    if (actor.chaosStacks >= 2) score += 18
    if (actor.havocUid && actor.havocUid !== target?.uid) score += 16
  }
  if (actor.specId === 'warlock-destro' && skill.id === 'aa' && actor.chaosStacks < 2) score += 6
  if (actor.pistolLoaded && skill.id === 's1') score += 28
  if (actor.executeFree && skill.effect.kind === 'execute') score += 40
  if (actor.specId === 'warrior-arms' && skill.id === 's1') {
    score += target && target.takenAmpTurns > 0 ? -6 : 16
  }
  return score
}

function clearcastMax(actor: Unit): number {
  return getSpec(actor.specId).skills.find((s) => s.effect.kind === 'clearcast')?.effect.value ?? 3
}

function shuffle<T>(list: T[]): T[] {
  const copy = list.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
