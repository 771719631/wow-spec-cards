import {
  getSpec,
  HAVOC_META_BLADE_PCT,
  HAVOC_META_CHAOS_PCT,
  MAX_PETS,
  PET_POOL,
  presentSkill,
} from '../data/specs'
import { SP_METER_MAX, type BattleState, type Side, type SkillDef, type SkillId, type Unit } from './types'
import { battleParams } from '../data/config-store'

export function unitName(unit: Unit): string {
  const spec = getSpec(unit.specId)
  return `${spec.className}·${spec.specName}`
}

export function living(units: Unit[], side?: Side): Unit[] {
  return units.filter((u) => u.hp > 0 && (side ? u.side === side : true))
}

export function teamSp(state: BattleState, side: Side): number {
  return side === 'player' ? state.playerSp : state.aiSp
}

export function setTeamSp(state: BattleState, side: Side, value: number): void {
  const next = Math.max(0, Math.min(state.maxSp, value))
  if (side === 'player') state.playerSp = next
  else state.aiSp = next
}

export function teamSpMeter(state: BattleState, side: Side): number {
  return side === 'player' ? state.playerSpMeter : state.aiSpMeter
}

export function nextSpGrant(state: BattleState, side: Side): number {
  const cycles = side === 'player' ? state.playerSpCycles : state.aiSpCycles
  if (cycles <= 0) return 3
  if (cycles === 1) return 4
  return 5
}

function chargeTeamSp(state: BattleState, side: Side): void {
  const meter = teamSpMeter(state, side)
  if (meter >= SP_METER_MAX) {
    const grant = nextSpGrant(state, side)
    const before = teamSp(state, side)
    setTeamSp(state, side, before + grant)
    const got = teamSp(state, side) - before
    if (side === 'player') {
      state.playerSpMeter = 0
      state.playerSpCycles += 1
    } else {
      state.aiSpMeter = 0
      state.aiSpCycles += 1
    }
    if (got > 0) pushLog(state, `行动充能完成，获得 ${got} 点技能点`)
    else pushLog(state, '行动充能完成，技能点已满')
    return
  }
  if (side === 'player') state.playerSpMeter = meter + 1
  else state.aiSpMeter = meter + 1
}

export function speedOf(unit: Unit): number {
  return unit.speed
}

export function isPet(unit: Unit): boolean {
  return unit.isPet
}

export function livingHeroes(units: Unit[], side?: Side): Unit[] {
  return living(units, side).filter((u) => !u.isPet)
}

export function petsOf(units: Unit[], ownerUid: string): Unit[] {
  return living(units).filter((u) => u.ownerUid === ownerUid)
}

export function rebuildQueue(state: BattleState): void {
  state.queue = living(state.units)
    .slice()
    .sort((a, b) => speedOf(b) - speedOf(a) || a.uid.localeCompare(b.uid))
    .map((u) => u.uid)
}

export function queuedUnits(state: BattleState): Unit[] {
  return state.queue
    .map((uid) => state.units.find((u) => u.uid === uid))
    .filter((u): u is Unit => Boolean(u && u.hp > 0))
}

export function currentActor(state: BattleState): Unit | null {
  const cutIn = living(state.units).find((u) => u.priorityAct && !u.acted && !u.stunned)
  if (cutIn) return cutIn
  for (const uid of state.queue) {
    const unit = state.units.find((u) => u.uid === uid)
    if (!unit || unit.hp <= 0 || unit.acted || unit.stunned) continue
    return unit
  }
  return null
}

export function skillCost(unit: Unit, skill: SkillDef): number {
  if (unit.pistolLoaded && unit.specId === 'rogue-outlaw' && skill.id === 's1') return 0
  if (unit.executeFree && unit.specId === 'warrior-arms' && skill.id === 's3') return 0
  if (unit.freeSkill && skill.cost > 0 && !skill.passive) return 0
  return skill.cost
}

export function canUseSkill(state: BattleState, unit: Unit, skill: SkillDef): boolean {
  const cur = currentActor(state)
  if (
    !cur ||
    cur.uid !== unit.uid ||
    unit.hp <= 0 ||
    unit.stunned ||
    skill.passive ||
    skill.effect.kind === 'stagger' ||
    skill.effect.kind === 'rooted' ||
    skill.effect.kind === 'sweep' ||
    skill.effect.kind === 'boneshield' ||
    skill.effect.kind === 'clearcast' ||
    skill.effect.kind === 'prescience'
  ) {
    return false
  }
  if (unit.specId === 'shaman-ele' && skill.effect.kind === 'ascend' && unit.eleOverloadTurns > 0) {
    return false
  }
  if (unit.specId === 'paladin-prot' && skill.effect.kind === 'ardent' && unit.ardentPct > 0) {
    return false
  }
  if (skill.effect.kind === 'kill-command' && petsOf(state.units, unit.uid).length === 0) {
    return false
  }
  if (skill.effect.kind === 'summon-pet' && petsOf(state.units, unit.uid).length >= (skill.effect.value || MAX_PETS)) {
    return false
  }
  if (skill.effect.kind === 'bestial-wrath' && petsOf(state.units, unit.uid).length === 0) {
    return false
  }
  if (skill.effect.kind === 'metamorphosis' && unit.metaTurns > 0) {
    return false
  }
  if ((unit.skillCd[skill.id] ?? 0) > 0) return false
  return teamSp(state, unit.side) >= skillCost(unit, skill)
}

export function opposite(side: Side): Side {
  return side === 'player' ? 'ai' : 'player'
}

export function validTargets(state: BattleState, actor: Unit, skill: SkillDef): Unit[] {
  switch (skill.target) {
    case 'all-enemies':
    case 'all-allies':
      return []
    case 'self':
      return [actor]
    case 'ally':
      return living(state.units, actor.side)
    case 'enemy':
    default:
      return living(state.units, opposite(actor.side))
  }
}

export function createBattle(
  playerSpecIds: string[],
  aiSpecIds: string[],
  playerSkins: Record<string, string> = {},
): BattleState {
  const units: Unit[] = [
    ...playerSpecIds.map((id, i) => makeUnit(id, 'player', i, playerSkins[id])),
    ...aiSpecIds.map((id, i) => makeUnit(id, 'ai', i)),
  ]
  const params = battleParams()
  const state: BattleState = {
    units,
    queue: [],
    turn: 'player',
    round: 1,
    playerSp: params.startSp,
    aiSp: params.startSp,
    maxSp: params.maxSp,
    playerSpMeter: 0,
    aiSpMeter: 0,
    playerSpCycles: 0,
    aiSpCycles: 0,
    log: ['开战。技能点全队共用，速度快的先出手。友方每行动一次为充能条填一格。'],
    winner: null,
  }
  hangingFloats = []
  rebuildQueue(state)
  beginTurn(state)
  return state
}

function makeUnit(specId: string, side: Side, index: number, skinId?: string): Unit {
  const spec = getSpec(specId)
  return {
    uid: `${side}-${index}-${specId}`,
    specId,
    side,
    hp: spec.maxHp,
    maxHp: spec.maxHp,
    speed: spec.speed,
    atk: spec.atk,
    crit: spec.crit,
    critDmg: spec.critDmg,
    shield: 0,
    stunned: false,
    acted: false,
    dots: [],
    hots: [],
    hasStagger: spec.skills.some((s) => s.effect.kind === 'stagger'),
    stagger: [0, 0, 0],
    dmgAmp: 0,
    dmgAmpTurns: 0,
    takenAmp: 0,
    takenAmpTurns: 0,
    healTakenPct: 100,
    executeFree: false,
    guardTurns: 0,
    pistolLoaded: false,
    eleOverloadTurns: 0,
    chaosStacks: 0,
    havocUid: null,
    priorityAct: false,
    ardentPct: 0,
    freeSkill: false,
    isPet: false,
    ownerUid: null,
    boneShield: 0,
    takenReducePct: 0,
    takenReduceTurns: 0,
    runeWeaponTurns: 0,
    clearcast: 0,
    magiFromUid: null,
    magiTurns: 0,
    magiStored: 0,
    metaTurns: 0,
    ebonAtkPct: 0,
    ebonTurns: 0,
    nextTakenAmp: 0,
    skinId: skinId || 'classic',
    skillCd: {},
  }
}

let petSeq = 0
let hangingFloats: FloatText[] = []

function summonAnimalCompanion(state: BattleState, owner: Unit, cap: number): Unit | null {
  if (petsOf(state.units, owner.uid).length >= cap) return null
  const specId = PET_POOL[Math.floor(Math.random() * PET_POOL.length)]
  petSeq += 1
  const pet = makeUnit(specId, owner.side, petSeq)
  pet.uid = `${owner.uid}-pet-${petSeq}`
  pet.isPet = true
  pet.ownerUid = owner.uid
  pet.acted = false
  pet.skinId = 'classic'
  state.units.push(pet)
  rebuildQueue(state)
  pushLog(state, `${unitName(owner)} 召唤了 ${unitName(pet)}`)
  return pet
}

function dismissPetsOf(state: BattleState, ownerUid: string): FloatText[] {
  const floats: FloatText[] = []
  for (const pet of state.units.filter((u) => u.ownerUid === ownerUid && u.hp > 0)) {
    pet.hp = 0
    pet.shield = 0
    pet.dots = []
    pet.hots = []
    pet.stunned = false
    pet.freeSkill = false
    pushLog(state, `${unitName(pet)} 随着主人倒下了`)
    floats.push({ uid: pet.uid, text: '消散', kind: 'kill' })
  }
  return floats
}

export function applyAction(
  state: BattleState,
  actorUid: string,
  skillId: SkillId,
  targetUid: string | null,
): { floats: FloatText[]; procAscend?: boolean; procSweep?: boolean; sweepUid?: string | null; executeLow?: boolean; executeKill?: boolean; petUids?: string[]; summonedUid?: string | null; extraUids?: string[] } {
  const actor = state.units.find((u) => u.uid === actorUid)
  if (!actor || state.winner) return { floats: [] }
  const spec = getSpec(actor.specId)
  const skill = spec.skills.find((s) => s.id === skillId)
  if (!skill || !canUseSkill(state, actor, skill)) return { floats: [] }

  const floats: FloatText[] = []
  let procSweep = false
  let sweepUid: string | null = null
  let executeLow = false
  let executeKill = false
  let petUids: string[] = []
  let summonedUid: string | null = null
  let extraUids: string[] = []
  const cost = skillCost(actor, skill)
  const usedFree = actor.freeSkill && skill.cost > 0
  setTeamSp(state, actor.side, teamSp(state, actor.side) - cost)
  if (skill.gainSp) setTeamSp(state, actor.side, teamSp(state, actor.side) + skill.gainSp)
  chargeTeamSp(state, actor.side)
  actor.acted = true
  actor.priorityAct = false
  if (usedFree) actor.freeSkill = false
  if (actor.specId === 'warrior-arms' && skill.id === 's3') actor.executeFree = false
  if (skill.cooldown && skill.cooldown > 0) actor.skillCd[skill.id] = skill.cooldown

  const shown = presentSkill(skill, actor)
  pushLog(state, `${unitName(actor)} 使用了 ${shown.name}`)

  const kind = skill.effect.kind
  if (kind === 'aoe') {
    const hits = aoeHitCount(skill)
    const amount = fromAtk(actor, skill.effect.value)
    const foes = living(state.units, opposite(actor.side))
    const bounce = actor.specId === 'paladin-prot' && skill.id === 's2'
    for (let i = 0; i < hits; i++) {
      foes.forEach((t, index) => {
        const dmg = dealDamage(state, actor, t, amount, skill.name)
        if (bounce) {
          for (const hit of dmg) hit.delay = index * 90
        }
        floats.push(...dmg)
      })
    }
  } else if (kind === 'ardent') {
    applyArdent(actor, skill.effect.value)
    pushLog(state, `${unitName(actor)} 的炽热防御者永久提升 ${skill.effect.value}% 攻击力与生命值`)
    floats.push({ uid: actor.uid, text: `炽热 +${skill.effect.value}%`, kind: 'buff' })
  } else if (kind === 'ascend') {
    const amount = fromAtk(actor, skill.effect.value)
    for (const t of living(state.units, opposite(actor.side))) {
      floats.push(...dealDamage(state, actor, t, amount, skill.name))
    }
    actor.eleOverloadTurns = skill.effect.extra ?? 2
    pushLog(state, `${unitName(actor)} 获得升腾过载 ${actor.eleOverloadTurns} 回合`)
    floats.push({ uid: actor.uid, text: '升腾过载', kind: 'buff' })
  } else if (kind === 'heal-aoe') {
    const amount = fromAtk(actor, skill.effect.value)
    const stages = skill.effect.extra != null && skill.effect.extra >= 2 && skill.effect.extra <= 6 ? skill.effect.extra : 1
    const allies = living(state.units, actor.side)
    for (let stage = 0; stage < stages; stage++) {
      for (const t of allies) {
        if (t.hp <= 0) continue
        const float = healUnit(state, actor, t, amount, skill.name)
        float.delay = stage * 220
        if (float.text !== '+0') floats.push(float)
      }
    }
  } else if (kind === 'gain-sp') {
    setTeamSp(state, actor.side, teamSp(state, actor.side) + skill.effect.value)
    pushLog(state, `${unitName(actor)} 为队伍增加了 ${skill.effect.value} 点技能点`)
    floats.push({ uid: actor.uid, text: `+${skill.effect.value}点`, kind: 'sp' })
  } else if (kind === 'kill-command') {
    const target = resolveTarget(state, actor, skill, targetUid)
    const pack = petsOf(state.units, actor.uid).slice().sort((a, b) => b.speed - a.speed)
    petUids = pack.map((p) => p.uid)
    if (target && pack.length > 0) {
      pack.forEach((pet, index) => {
        const hits = dealDamage(state, pet, target, fromAtk(pet, skill.effect.value), skill.name)
        for (const hit of hits) hit.delay = index * 90
        floats.push(...hits)
      })
      pushLog(state, `${unitName(actor)} 的杀戮命令令 ${pack.length} 只宠物扑向 ${unitName(target)}`)
    }
  } else if (kind === 'summon-pet') {
    const pet = summonAnimalCompanion(state, actor, skill.effect.value || MAX_PETS)
    if (pet) {
      summonedUid = pet.uid
      petUids = [pet.uid]
      floats.push({ uid: pet.uid, text: '现身', kind: 'buff' })
      floats.push({ uid: actor.uid, text: unitName(pet), kind: 'buff' })
    }
  } else if (kind === 'bestial-wrath') {
    const buff = skill.effect.extra ?? 20
    const pack = petsOf(state.units, actor.uid)
    petUids = pack.map((p) => p.uid)
    for (const unit of [actor, ...pack]) {
      unit.dmgAmp = Math.max(unit.dmgAmp, buff)
      unit.dmgAmpTurns = Math.max(unit.dmgAmpTurns, 3)
      floats.push({ uid: unit.uid, text: `怒火 +${buff}%`, kind: 'buff' })
    }
    pushLog(state, `${unitName(actor)} 的狂野怒火使自身与宠物伤害提高 ${buff}%，持续 3 回合`)
    const foes = living(state.units, opposite(actor.side))
    pack.forEach((pet, petIndex) => {
      const amount = fromAtk(pet, skill.effect.value)
      for (const foe of foes) {
        const hits = dealDamage(state, pet, foe, amount, skill.name)
        for (const hit of hits) hit.delay = petIndex * 90
        floats.push(...hits)
      }
    })
  } else if (kind === 'amz') {
    const pct = skill.effect.value
    const turns = skill.effect.extra ?? 1
    for (const ally of living(state.units, actor.side)) {
      ally.takenReducePct = Math.max(ally.takenReducePct, pct)
      ally.takenReduceTurns = Math.max(ally.takenReduceTurns, turns)
      floats.push({ uid: ally.uid, text: `减伤 ${pct}%`, kind: 'buff' })
    }
    pushLog(state, `${unitName(actor)} 的反魔法领域使己方全体受到的伤害降低 ${pct}%，持续 ${turns} 回合`)
  } else if (kind === 'rune-weapon') {
    const amp = skill.effect.value
    const stacks = skill.effect.extra ?? 5
    actor.dmgAmp = Math.max(actor.dmgAmp, amp)
    actor.dmgAmpTurns = Math.max(actor.dmgAmpTurns, 2)
    actor.runeWeaponTurns = Math.max(actor.runeWeaponTurns, 2)
    floats.push(...grantBoneShield(actor, stacks))
    floats.push({ uid: actor.uid, text: `刃舞 +${amp}%`, kind: 'buff' })
    pushLog(state, `${unitName(actor)} 的符文刃舞伤害提高 ${amp}%，持续 2 回合`)
  } else if (kind === 'chaos-strike' || kind === 'eye-beam') {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      const caused = havocVolley(state, actor, [target], skill, shown.name, floats, 0)
      if (kind === 'eye-beam' && caused > 0) {
        const heal = healUnit(state, actor, actor, caused, shown.name)
        heal.delay = (skill.effect.extra ?? 3) * HAVOC_GAP
        if (heal.text !== '+0') floats.push(heal)
        pushLog(state, `${unitName(actor)} 的眼棱吸取了 ${caused} 点生命`)
      }
    }
  } else if (kind === 'blade-dance') {
    havocVolley(state, actor, living(state.units, opposite(actor.side)), skill, shown.name, floats, 0)
  } else if (kind === 'metamorphosis') {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      floats.push(...dealDamage(state, actor, target, fromAtk(actor, skill.effect.value), shown.name))
      if (target.hp > 0) {
        target.stunned = true
        floats.push({ uid: target.uid, text: '眩晕', kind: 'stun' })
        pushLog(state, `${unitName(target)} 被眩晕`)
      }
      actor.metaTurns = Math.max(actor.metaTurns, skill.effect.extra ?? 2)
      floats.push({ uid: actor.uid, text: `变形 ${actor.metaTurns}`, kind: 'buff' })
      pushLog(state, `${unitName(actor)} 进入恶魔变形，持续 ${actor.metaTurns} 回合`)
    }
  } else if (kind === 'eruption') {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      floats.push(...dealDamage(state, actor, target, fromAtk(actor, skill.effect.value), shown.name))
      floats.push(...extendEbonMight(state, actor, 1))
    }
  } else if (kind === 'ebon-might') {
    const pct = skill.effect.value
    const turns = skill.effect.extra ?? 2
    for (const ally of living(state.units, actor.side)) {
      ally.ebonAtkPct = Math.max(ally.ebonAtkPct, pct)
      ally.ebonTurns = Math.max(ally.ebonTurns, turns)
      floats.push({ uid: ally.uid, text: `攻 +${pct}%`, kind: 'buff' })
    }
    pushLog(state, `${unitName(actor)} 的黑檀之力使己方全体攻击力提高 ${pct}%，持续 ${turns} 回合`)
  } else if (kind === 'deep-breath') {
    const amount = fromAtk(actor, skill.effect.value)
    const vuln = skill.effect.extra ?? 50
    living(state.units, opposite(actor.side)).forEach((foe, index) => {
      const hits = dealDamage(state, actor, foe, amount, shown.name)
      for (const hit of hits) hit.delay = index * 50
      floats.push(...hits)
      if (foe.hp > 0) {
        foe.nextTakenAmp = Math.max(foe.nextTakenAmp, vuln)
        floats.push({ uid: foe.uid, text: `下易 ${vuln}%`, kind: 'buff', delay: index * 50 })
      }
    })
    pushLog(state, `${unitName(actor)} 的深呼吸使敌方全体下次受到的伤害提高 ${vuln}%`)
  } else if (kind === 'missiles') {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      extraUids = fireArcaneMissiles(state, actor, target, skill, floats, true)
    }
  } else if (kind === 'prismatic') {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      floats.push(...dealDamage(state, actor, target, fromAtk(actor, skill.effect.value), skill.name))
      floats.push(...grantClearcast(actor, 1))
    }
  } else if (kind === 'touch-magi') {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      applyTouchOfTheMagi(state, actor, target, skill.effect.extra ?? 2)
      floats.push({ uid: target.uid, text: '大法师之触', kind: 'buff' })
      floats.push(...dealDamage(state, actor, target, fromAtk(actor, skill.effect.value), skill.name))
      floats.push(...grantClearcast(actor, 2))
      pushLog(state, `${unitName(actor)} 的大法师之触标记了 ${unitName(target)}`)
    }
  } else {
    const target = resolveTarget(state, actor, skill, targetUid)
    if (target) {
      const wasLow = target.hp / target.maxHp < 0.35
      if (actor.specId === 'warlock-destro' && (skill.id === 'aa' || skill.id === 's1')) {
        floats.push(...castDestroBolt(state, actor, target, skill))
      } else {
        floats.push(...applySingle(state, actor, target, skill))
      }
      if (actor.specId === 'warrior-arms' && skill.id === 's3') {
        executeLow = wasLow
        executeKill = target.hp <= 0
      }
      maybeArmsExecuteKill(state, actor, skill, target, floats)
      sweepUid = maybeSweepingStrikes(state, actor, skill, target, floats)
      procSweep = Boolean(sweepUid)
    }
  }

  if (actor.specId === 'rogue-outlaw' && skill.id === 's3') {
    actor.pistolLoaded = true
    pushLog(state, `${unitName(actor)} 的下一次手枪射击不耗技能点，并获得额外回合`)
    floats.push({ uid: actor.uid, text: '手枪装填', kind: 'buff' })
  } else if (actor.specId === 'rogue-outlaw' && skill.id === 's1' && actor.pistolLoaded) {
    actor.pistolLoaded = false
    actor.acted = false
    pushLog(state, `${unitName(actor)} 获得额外回合`)
    floats.push({ uid: actor.uid, text: '额外回合', kind: 'buff' })
  }

  const procAscend = maybeProcRooted(state, actor, skill, floats)

  checkWinner(state)
  if (!state.winner) afterAction(state)
  if (hangingFloats.length) {
    floats.push(...hangingFloats)
    hangingFloats = []
  }
  return { floats, procAscend, procSweep, sweepUid, executeLow, executeKill, petUids, summonedUid, extraUids }
}

function resolveTarget(
  state: BattleState,
  actor: Unit,
  skill: SkillDef,
  targetUid: string | null,
): Unit | null {
  const opts = validTargets(state, actor, skill)
  if (skill.target === 'self') return actor
  if (!targetUid) return opts[0] ?? null
  return opts.find((u) => u.uid === targetUid) ?? null
}

function applySingle(state: BattleState, actor: Unit, target: Unit, skill: SkillDef): FloatText[] {
  const { kind, value, extra } = skill.effect
  switch (kind) {
    case 'heal':
      return [healUnit(state, actor, target, fromAtk(actor, value), skill.name)]
    case 'shield': {
      const amount = fromAtk(actor, value)
      target.shield += amount
      pushLog(state, `${unitName(actor)} 的 ${skill.name} 为 ${unitName(target)} 加上 ${amount} 点护盾`)
      return [{ uid: target.uid, text: `+${amount}盾`, kind: 'shield' }]
    }
    case 'infuse': {
      const amount = fromAtk(actor, value)
      target.shield += amount
      target.dmgAmp = extra ?? 30
      target.dmgAmpTurns = 2
      pushLog(
        state,
        `${unitName(actor)} 的 ${skill.name} 为 ${unitName(target)} 加上 ${amount} 点护盾，伤害提高 ${target.dmgAmp}%`,
      )
      return [
        { uid: target.uid, text: `+${amount}盾`, kind: 'shield' },
        { uid: target.uid, text: `增伤 ${target.dmgAmp}%`, kind: 'buff' },
      ]
    }
    case 'guard':
      actor.guardTurns = extra ?? 2
      pushLog(state, `${unitName(actor)} 召唤玄牛，为队友分担伤害`)
      return [{ uid: actor.uid, text: '玄牛', kind: 'share' }]
    case 'havoc':
      actor.havocUid = target.uid
      pushLog(state, `${unitName(target)} 被施加浩劫`)
      return [{ uid: target.uid, text: '浩劫', kind: 'buff' }]
    case 'empower':
      target.dmgAmp = Math.max(target.dmgAmp, value)
      target.dmgAmpTurns = Math.max(target.dmgAmpTurns, extra ?? 1)
      target.acted = false
      target.priorityAct = true
      pushLog(state, `${unitName(target)} 获得立即回合，本回合伤害提高 ${value}%`)
      return [
        { uid: target.uid, text: '立即回合', kind: 'buff' },
        { uid: target.uid, text: `增伤 ${value}%`, kind: 'buff' },
      ]
    case 'dot': {
      const tick = fromAtk(actor, value)
      target.dots.push({ dmg: tick, turns: extra ?? 3 })
      const hits = dealDamage(state, actor, target, Math.ceil(tick / 2), skill.name)
      pushLog(state, `${unitName(target)} 受到持续伤害`)
      return [...hits, { uid: target.uid, text: '持续', kind: 'dot' }]
    }
    case 'hot': {
      const tick = fromAtk(actor, value)
      const turns = extra ?? 3
      target.hots = target.hots.filter((h) => h.skillName !== skill.name)
      target.hots.push({ heal: tick, turns: turns - 1, fromUid: actor.uid, skillName: skill.name })
      const first = healUnit(state, actor, target, tick, skill.name)
      pushLog(state, `${unitName(target)} 获得回春，持续 ${turns} 回合`)
      return [first, { uid: target.uid, text: '回春', kind: 'buff' }]
    }
    case 'innervate':
      target.freeSkill = true
      pushLog(state, `${unitName(actor)} 的激活使 ${unitName(target)} 的下一个技能不耗技能点`)
      return [{ uid: target.uid, text: '下次免费', kind: 'sp' }]
    case 'deathstrike': {
      const missing = 1 - actor.hp / Math.max(1, actor.maxHp)
      const healPct = 50 + Math.round(missing * 150)
      const hits = dealDamage(state, actor, target, fromAtk(actor, value), skill.name)
      const heal = healUnit(state, actor, actor, fromAtk(actor, healPct), skill.name)
      if (heal.text !== '+0') {
        heal.delay = 80
        hits.push(heal)
      }
      const stacks = 2 + (actor.runeWeaponTurns > 0 ? 1 : 0)
      hits.push(...grantBoneShield(actor, stacks))
      return hits
    }
    case 'stun':
      target.stunned = true
      pushLog(state, `${unitName(target)} 被眩晕`)
      return [
        ...dealDamage(state, actor, target, fromAtk(actor, value), skill.name),
        { uid: target.uid, text: '眩晕', kind: 'stun' },
      ]
    case 'execute': {
      const low = target.hp / target.maxHp < 0.35
      const hits = dealDamage(state, actor, target, fromAtk(actor, value), skill.name)
      if (low && target.hp > 0) {
        const extraHits = dealDamage(state, actor, target, fromAtk(actor, extra ?? 0), skill.name)
        for (const hit of extraHits) hit.delay = 220
        hits.push(...extraHits)
      }
      return hits
    }
    default: {
      if (actor.specId === 'warrior-arms' && skill.id === 's1') {
        target.takenAmp = 30
        target.takenAmpTurns = 2
        pushLog(state, `${unitName(target)} 受到的伤害提高 30%，持续 2 回合`)
      }
      const pct = rollSkillPct(skill)
      const dmg = fromAtk(actor, pct)
      if (skill.effect.extra != null && skill.effect.extra > skill.effect.value) {
        pushLog(state, `${unitName(actor)} 的 ${skill.name} 掷出攻击力 ${pct}% 伤害`)
      }
      const hits = dealDamage(state, actor, target, dmg, skill.name)
      if (actor.specId === 'warrior-arms' && skill.id === 'aa' && target.hp > 0) {
        target.healTakenPct = 50
        pushLog(state, `${unitName(target)} 受到的治疗效果降低 50%`)
        hits.push({ uid: target.uid, text: '重伤', kind: 'buff' })
      }
      if (actor.specId === 'warrior-arms' && skill.id === 's1' && target.hp > 0) {
        hits.push({ uid: target.uid, text: '易伤 30%', kind: 'buff' })
      }
      if (actor.specId === 'paladin-prot' && skill.id === 's1') {
        const healAmt = fromAtk(actor, extra ?? 10)
        for (const ally of living(state.units, actor.side)) {
          const heal = healUnit(state, actor, ally, healAmt, skill.name)
          heal.delay = 80
          if (heal.text !== '+0') hits.push(heal)
        }
      }
      return hits
    }
  }
}

function castDestroBolt(
  state: BattleState,
  actor: Unit,
  target: Unit,
  skill: SkillDef,
): FloatText[] {
  const floats: FloatText[] = []
  let dmg = fromAtk(actor, skill.effect.value)
  if (skill.id === 's1' && actor.chaosStacks > 0) {
    const bonus = actor.chaosStacks * 20
    dmg = Math.round(dmg * (1 + actor.chaosStacks * 0.2))
    pushLog(state, `${unitName(actor)} 的混乱之箭获得 ${bonus}% 增伤`)
    actor.chaosStacks = 0
  }
  floats.push(...dealDamage(state, actor, target, dmg, skill.name))
  const marked = actor.havocUid
    ? state.units.find((u) => u.uid === actor.havocUid && u.hp > 0)
    : null
  if (marked && marked.uid !== target.uid) {
    pushLog(state, `${unitName(actor)} 的浩劫波及 ${unitName(marked)}`)
    floats.push(...dealDamage(state, actor, marked, dmg, skill.name))
  }
  if (skill.id === 'aa') {
    actor.chaosStacks = Math.min(2, actor.chaosStacks + 1)
    pushLog(state, `${unitName(actor)} 的混乱之箭增伤 ${actor.chaosStacks * 20}%`)
    floats.push({ uid: actor.uid, text: `混乱+${actor.chaosStacks * 20}%`, kind: 'buff' })
  }
  return floats
}

function aoeHitCount(skill: SkillDef): number {
  const extra = skill.effect.extra
  if (extra != null && extra >= 2 && extra <= 6) return extra
  return 1
}

function maybeArmsExecuteKill(
  state: BattleState,
  actor: Unit,
  skill: SkillDef,
  target: Unit,
  floats: FloatText[],
): void {
  if (actor.specId !== 'warrior-arms' || skill.id !== 's3' || target.hp > 0) return
  actor.acted = false
  actor.executeFree = true
  pushLog(state, `${unitName(actor)} 斩杀击杀，获得额外回合，下一次斩杀不耗技能点`)
  floats.push({ uid: actor.uid, text: '额外回合', kind: 'buff' })
  floats.push({ uid: actor.uid, text: '斩杀免费', kind: 'sp' })
}

function maybeSweepingStrikes(
  state: BattleState,
  actor: Unit,
  skill: SkillDef,
  primary: Unit,
  floats: FloatText[],
): string | null {
  if (actor.specId !== 'warrior-arms') return null
  if (skill.id !== 'aa' && skill.id !== 's1' && skill.id !== 's3') return null
  const sweep = getSpec(actor.specId).skills.find((s) => s.effect.kind === 'sweep')
  if (!sweep) return null
  const others = living(state.units, opposite(actor.side)).filter((u) => u.uid !== primary.uid)
  if (others.length === 0) return null
  const t = others[Math.floor(Math.random() * others.length)]
  const dealt = floats.reduce((sum, item) => {
    if (item.uid !== primary.uid) return sum
    if (item.kind !== 'damage' && item.kind !== 'kill') return sum
    const n = Number(/^[-−]?(\d+)/.exec(item.text)?.[1] ?? 0)
    return sum + n
  }, 0)
  const dmg = Math.max(1, Math.round(dealt * (sweep.effect.value / 100)))
  pushLog(state, `${unitName(actor)} 的横扫攻击波及 ${unitName(t)}，为 ${skill.name} 伤害的 ${sweep.effect.value}%`)
  const hits = dealDamage(state, actor, t, dmg, sweep.name)
  for (const hit of hits) hit.delay = 280
  floats.push(...hits)
  floats.push({ uid: t.uid, text: '横扫', kind: 'buff', delay: 280 })
  return t.uid
}

export function executeReady(state: BattleState, unit: Unit): boolean {
  if (unit.specId !== 'warrior-arms' || unit.hp <= 0) return false
  return living(state.units, opposite(unit.side)).some((u) => u.hp / u.maxHp < 0.35)
}

export function matchHasArms(state: BattleState): boolean {
  return state.units.some((u) => u.specId === 'warrior-arms')
}

function maybeProcRooted(
  state: BattleState,
  actor: Unit,
  skill: SkillDef,
  floats: FloatText[],
): boolean {
  if (actor.specId !== 'shaman-ele' || skill.effect.kind === 'rooted' || skill.effect.kind === 'ascend') return false
  const foes = living(state.units, opposite(actor.side))
  if (foes.length === 0) return false
  const rooted = getSpec(actor.specId).skills.find((s) => s.effect.kind === 'rooted')
  if (!rooted) return false
  const overload = actor.eleOverloadTurns > 0 && (skill.id === 'aa' || skill.id === 's2')
  const chance = rooted.effect.extra ?? 20
  if (!overload && Math.random() * 100 >= chance) return false
  const dmg = fromAtk(actor, rooted.effect.value)
  pushLog(state, `${unitName(actor)} 触发了根深蒂固：升腾`)
  floats.push({ uid: actor.uid, text: '升腾', kind: 'buff' })
  for (const t of foes) {
    floats.push(...dealDamage(state, actor, t, dmg, '升腾'))
  }
  return true
}

function fromAtk(actor: Unit, pct: number): number {
  return Math.max(0, Math.round(effectiveAtk(actor) * pct / 100))
}

export function effectiveAtk(unit: Unit): number {
  if (unit.ebonAtkPct <= 0) return unit.atk
  return Math.round(unit.atk * (1 + unit.ebonAtkPct / 100))
}

export function prescienceBonus(state: BattleState, unit: Unit): number {
  if (unit.hp <= 0) return 0
  if (!livingHeroes(state.units, unit.side).some((u) => u.specId === 'evoker-aug')) return 0
  return getSpec('evoker-aug').skills.find((s) => s.effect.kind === 'prescience')?.effect.value ?? 20
}

export function effectiveCrit(state: BattleState, unit: Unit): number {
  return unit.crit + prescienceBonus(state, unit)
}

function extendEbonMight(state: BattleState, actor: Unit, add: number): FloatText[] {
  const floats: FloatText[] = []
  for (const ally of living(state.units, actor.side)) {
    if (ally.ebonTurns <= 0) continue
    ally.ebonTurns += add
    floats.push({ uid: ally.uid, text: `黑檀 ${ally.ebonTurns}`, kind: 'buff' })
  }
  if (floats.length) {
    pushLog(state, `${unitName(actor)} 的喷发使黑檀之力延长 ${add} 回合`)
  }
  return floats
}

function applyArdent(unit: Unit, addPct: number): void {
  const spec = getSpec(unit.specId)
  unit.ardentPct += addPct
  const nextAtk = Math.round(spec.atk * (1 + unit.ardentPct / 100))
  const nextMax = Math.round(spec.maxHp * (1 + unit.ardentPct / 100))
  const gained = Math.max(0, nextMax - unit.maxHp)
  unit.atk = nextAtk
  unit.maxHp = nextMax
  unit.hp = Math.min(nextMax, unit.hp + gained)
}

function maybeArdentOnAllyDeath(state: BattleState, dead: Unit): FloatText[] {
  if (dead.isPet) return []
  const floats: FloatText[] = []
  for (const unit of living(state.units, dead.side)) {
    if (unit.specId !== 'paladin-prot' || unit.ardentPct <= 0) continue
    const extra = getSpec(unit.specId).skills.find((s) => s.effect.kind === 'ardent')?.effect.extra ?? 20
    applyArdent(unit, extra)
    pushLog(state, `${unitName(unit)} 因队友阵亡，炽热防御者再提升 ${extra}% 攻击力与生命值`)
    floats.push({ uid: unit.uid, text: `炽热 +${extra}%`, kind: 'buff' })
  }
  return floats
}

function rollSkillPct(skill: SkillDef): number {
  const { value, extra } = skill.effect
  if (extra != null && extra > value) {
    return value + Math.floor(Math.random() * (extra - value + 1))
  }
  return value
}

function dealDamage(
  state: BattleState,
  actor: Unit,
  target: Unit,
  amount: number,
  skillName: string,
  opts: { skipGuard?: boolean; skipStagger?: boolean; skipAmp?: boolean; skipCrit?: boolean } = {},
): FloatText[] {
  if (amount <= 0 || target.hp <= 0) return []
  if (!opts.skipAmp && actor.uid !== target.uid && actor.dmgAmp > 0) {
    amount = Math.round(amount * (1 + actor.dmgAmp / 100))
  }
  if (actor.uid !== target.uid && target.takenAmp > 0) {
    amount = Math.round(amount * (1 + target.takenAmp / 100))
  }
  let ampTag: string | undefined =
    actor.uid !== target.uid && target.takenAmp > 0 ? `+${target.takenAmp}%` : undefined
  if (actor.uid !== target.uid && target.nextTakenAmp > 0) {
    const extra = target.nextTakenAmp
    amount = Math.round(amount * (1 + extra / 100))
    ampTag = ampTag ? `${ampTag}+${extra}%` : `+${extra}%`
    target.nextTakenAmp = 0
  }
  if (actor.uid !== target.uid && target.takenReducePct > 0) {
    amount = Math.round(amount * (1 - target.takenReducePct / 100))
  }
  let crit = false
  if (!opts.skipCrit && actor.uid !== target.uid) {
    crit = Math.random() * 100 < effectiveCrit(state, actor)
    if (crit) amount = Math.round(amount * actor.critDmg / 100)
  }

  const floats: FloatText[] = []
  if (!opts.skipGuard) {
    const guard = living(state.units, target.side).find(
      (u) => u.guardTurns > 0 && u.uid !== target.uid,
    )
    if (guard) {
      const shared = Math.floor(amount / 2)
      amount -= shared
      if (shared > 0) {
        pushLog(state, `${unitName(guard)} 为 ${unitName(target)} 分担了 ${shared} 点伤害`)
        floats.push(
          ...dealDamage(state, actor, guard, shared, skillName, {
            skipGuard: true,
            skipAmp: true,
            skipCrit: true,
          }),
        )
        floats.push({ uid: guard.uid, text: '分担', kind: 'share' })
      }
    }
  }

  if (!opts.skipStagger && target.hasStagger && amount > 0) {
    const deferred = Math.floor(amount / 2)
    amount -= deferred
    if (deferred > 0) {
      addStagger(target, deferred)
      pushLog(state, `${unitName(target)} 将 ${deferred} 点伤害醉拳摊还`)
      floats.push({ uid: target.uid, text: `醉拳 ${deferred}`, kind: 'stagger' })
    }
  }

  let left = amount
  let absorbed = 0
  if (target.shield > 0 && left > 0) {
    absorbed = Math.min(target.shield, left)
    target.shield -= absorbed
    left -= absorbed
  }
  if (left > 0) target.hp = Math.max(0, target.hp - left)
  const dead = target.hp <= 0
  if (amount > 0 && actor.uid !== target.uid) {
    const critBit = crit ? '暴击，' : ''
    const shieldBit = absorbed > 0 ? `（护盾吸收 ${absorbed}）` : ''
    pushLog(
      state,
      `${unitName(actor)} 的 ${skillName} 对 ${unitName(target)} ${critBit}造成 ${amount} 点伤害${shieldBit}`,
    )
  }
  if (amount > 0 && actor.uid !== target.uid && target.magiFromUid === actor.uid && target.magiTurns > 0) {
    target.magiStored += amount
  }
  if (amount > 0 && actor.uid !== target.uid && target.boneShield > 0) {
    floats.push(...consumeBoneShield(state, target))
  }
  if (dead) {
    if (target.magiFromUid && target.magiStored > 0) {
      floats.push(...detonateTouchOfTheMagi(state, target))
    }
    target.hp = 0
    target.shield = 0
    target.dots = []
    target.stunned = false
    target.stagger = [0, 0, 0]
    target.dmgAmp = 0
    target.dmgAmpTurns = 0
    target.takenAmp = 0
    target.takenAmpTurns = 0
    target.healTakenPct = 100
    target.executeFree = false
    target.guardTurns = 0
    target.eleOverloadTurns = 0
    target.priorityAct = false
    target.ardentPct = 0
    target.hots = []
    target.freeSkill = false
    target.boneShield = 0
    target.takenReducePct = 0
    target.takenReduceTurns = 0
    target.runeWeaponTurns = 0
    target.clearcast = 0
    target.metaTurns = 0
    target.ebonAtkPct = 0
    target.ebonTurns = 0
    target.nextTakenAmp = 0
    if (target.magiFromUid) {
      target.magiFromUid = null
      target.magiTurns = 0
      target.magiStored = 0
    }
    for (const unit of state.units) {
      if (unit.havocUid === target.uid) unit.havocUid = null
    }
    pushLog(state, `${unitName(target)} 倒下了`)
    floats.push(...maybeArdentOnAllyDeath(state, target))
    if (!target.isPet) floats.push(...dismissPetsOf(state, target.uid))
  }
  if (amount > 0) {
    floats.push({
      uid: target.uid,
      text: `-${amount}`,
      kind: dead ? 'kill' : 'damage',
      crit,
      tag: ampTag,
    })
  }
  return floats
}

const MISSILE_GAP = 70
const EXTRA_LEAD = 120
const EXTRA_GAP = 100
const HAVOC_GAP = 70

function causedFromHits(hits: FloatText[]): number {
  return hits.reduce((n, hit) => {
    if (hit.kind !== 'damage' && hit.kind !== 'kill') return n
    const match = /^-(\d+)/.exec(hit.text)
    return n + (match ? Number(match[1]) : 0)
  }, 0)
}

function havocHitPct(actor: Unit, skill: SkillDef): number {
  if (actor.metaTurns > 0 && skill.effect.kind === 'chaos-strike') return HAVOC_META_CHAOS_PCT
  if (actor.metaTurns > 0 && skill.effect.kind === 'blade-dance') return HAVOC_META_BLADE_PCT
  return skill.effect.value
}

function havocVolley(
  state: BattleState,
  actor: Unit,
  targets: Unit[],
  skill: SkillDef,
  skillName: string,
  floats: FloatText[],
  delayBase: number,
): number {
  const waves = skill.effect.extra ?? 2
  const amount = fromAtk(actor, havocHitPct(actor, skill))
  let caused = 0
  for (let wave = 0; wave < waves; wave++) {
    for (const target of targets) {
      if (target.hp <= 0) continue
      const hits = dealDamage(state, actor, target, amount, skillName)
      caused += causedFromHits(hits)
      for (const hit of hits) hit.delay = delayBase + wave * HAVOC_GAP
      floats.push(...hits)
    }
  }
  return caused
}

function clearcastCap(unit: Unit): number {
  return getSpec(unit.specId).skills.find((s) => s.effect.kind === 'clearcast')?.effect.value ?? 3
}

function grantClearcast(unit: Unit, stacks: number): FloatText[] {
  const cap = clearcastCap(unit)
  if (cap <= 0 || stacks <= 0) return []
  const next = Math.min(cap, unit.clearcast + stacks)
  if (next === unit.clearcast) return [{ uid: unit.uid, text: `节能 ${unit.clearcast}`, kind: 'buff' }]
  unit.clearcast = next
  return [{ uid: unit.uid, text: `节能 ${unit.clearcast}`, kind: 'buff' }]
}

function applyTouchOfTheMagi(state: BattleState, caster: Unit, target: Unit, turns: number): void {
  for (const unit of state.units) {
    if (unit.magiFromUid === caster.uid && unit.uid !== target.uid) {
      unit.magiFromUid = null
      unit.magiTurns = 0
      unit.magiStored = 0
    }
  }
  target.magiFromUid = caster.uid
  target.magiTurns = turns
  target.magiStored = 0
}

function detonateTouchOfTheMagi(state: BattleState, marked: Unit): FloatText[] {
  const caster = state.units.find((u) => u.uid === marked.magiFromUid)
  const stored = marked.magiStored
  marked.magiFromUid = null
  marked.magiTurns = 0
  marked.magiStored = 0
  if (!caster || stored <= 0) return []
  const boom = Math.round(stored * 80 / 100)
  const floats: FloatText[] = [{ uid: marked.uid, text: '引爆', kind: 'buff' }]
  pushLog(state, `${unitName(caster)} 的大法师之触引爆，累计 ${stored}，对敌方全体造成 ${boom} 点伤害`)
  living(state.units, opposite(caster.side)).forEach((foe, index) => {
    const hits = dealDamage(state, caster, foe, boom, '大法师之触', { skipAmp: true, skipCrit: true })
    for (const hit of hits) hit.delay = index * 50
    floats.push(...hits)
  })
  return floats
}

function fireArcaneMissiles(
  state: BattleState,
  actor: Unit,
  primary: Unit,
  skill: SkillDef,
  floats: FloatText[],
  allowProc: boolean,
): string[] {
  const spent = actor.clearcast
  if (spent > 0) {
    actor.clearcast = 0
    floats.push({ uid: actor.uid, text: `消耗节能 ${spent}`, kind: 'buff' })
    pushLog(state, `${unitName(actor)} 消耗 ${spent} 层节能施法`)
  }
  volleyMissiles(state, actor, primary, skill, floats, 0)
  const extras = pickMissileExtras(state, actor, primary, spent)
  extras.forEach((foe, index) => {
    volleyMissiles(state, actor, foe, skill, floats, EXTRA_LEAD + index * EXTRA_GAP)
  })
  if (allowProc) {
    const chance = getSpec(actor.specId).skills.find((s) => s.effect.kind === 'clearcast')?.effect.extra ?? 20
    if (Math.random() * 100 < chance) floats.push(...grantClearcast(actor, 1))
  }
  return extras.map((u) => u.uid)
}

function volleyMissiles(
  state: BattleState,
  actor: Unit,
  target: Unit,
  skill: SkillDef,
  floats: FloatText[],
  delayBase: number,
): void {
  const waves = skill.effect.extra ?? 5
  const amount = fromAtk(actor, skill.effect.value)
  for (let i = 0; i < waves; i++) {
    const hits = dealDamage(state, actor, target, amount, skill.name)
    for (const hit of hits) hit.delay = delayBase + i * MISSILE_GAP
    floats.push(...hits)
  }
}

function pickMissileExtras(state: BattleState, actor: Unit, primary: Unit, count: number): Unit[] {
  if (count <= 0) return []
  const others = living(state.units, opposite(actor.side)).filter((u) => u.uid !== primary.uid)
  const pool = others.length > 0 ? others : living(state.units, opposite(actor.side))
  if (pool.length === 0) return []
  return Array.from({ length: count }, (_, i) => pool[i % pool.length])
}

const MAX_BONE_SHIELD = 10

function grantBoneShield(unit: Unit, stacks: number): FloatText[] {
  if (!getSpec(unit.specId).skills.some((s) => s.effect.kind === 'boneshield')) return []
  unit.boneShield = Math.min(MAX_BONE_SHIELD, unit.boneShield + stacks)
  return [{ uid: unit.uid, text: `骨盾 ${unit.boneShield}`, kind: 'buff' }]
}

function consumeBoneShield(state: BattleState, owner: Unit): FloatText[] {
  if (owner.boneShield <= 0) return []
  owner.boneShield -= 1
  const allies = living(state.units, owner.side)
  const pick = allies[Math.floor(Math.random() * allies.length)]
  if (!pick) return [{ uid: owner.uid, text: `骨盾 ${owner.boneShield}`, kind: 'buff' }]
  const heal = healUnit(state, owner, pick, fromAtk(owner, 50), '骨盾')
  heal.delay = 60
  pushLog(state, `${unitName(owner)} 的骨盾为 ${unitName(pick)} 恢复生命，剩余 ${owner.boneShield} 层`)
  const floats: FloatText[] = [{ uid: owner.uid, text: `骨盾 ${owner.boneShield}`, kind: 'buff' }]
  if (heal.text !== '+0') floats.push(heal)
  return floats
}

function addStagger(unit: Unit, amount: number): void {
  if (unit.stagger.length < 3) unit.stagger = [0, 0, 0]
  const base = Math.floor(amount / 3)
  const rem = amount - base * 3
  for (let i = 0; i < 3; i++) {
    unit.stagger[i] = (unit.stagger[i] ?? 0) + base + (i < rem ? 1 : 0)
  }
}

function healUnit(
  state: BattleState,
  actor: Unit,
  target: Unit,
  amount: number,
  skillName: string,
): FloatText {
  const reduced = target.healTakenPct !== 100
  if (reduced) {
    amount = Math.round(amount * target.healTakenPct / 100)
  }
  const before = target.hp
  target.hp = Math.min(target.maxHp, target.hp + amount)
  const gained = target.hp - before
  const wound = reduced ? '（重伤减免）' : ''
  pushLog(state, `${unitName(actor)} 的 ${skillName} 为 ${unitName(target)} 恢复 ${gained} 点生命${wound}`)
  return { uid: target.uid, text: `+${gained}`, kind: 'heal' }
}

function afterAction(state: BattleState): void {
  beginTurn(state)
}

export function skipCurrent(state: BattleState): void {
  const actor = currentActor(state)
  if (!actor || state.winner) return
  actor.acted = true
  pushLog(state, `${unitName(actor)} 无法行动，跳过`)
  afterAction(state)
}

export function beginTurn(state: BattleState): void {
  if (state.winner) return
  skipStunned(state)
  const actor = currentActor(state)
  if (actor) {
    state.turn = actor.side
    return
  }
  if (living(state.units).some((u) => !u.acted)) return
  newRound(state)
}

function skipStunned(state: BattleState): void {
  for (const unit of living(state.units)) {
    if (unit.acted || !unit.stunned) continue
    if (unit.priorityAct || currentActorWouldBe(state, unit)) {
      unit.stunned = false
      unit.acted = true
      unit.priorityAct = false
      pushLog(state, `${unitName(unit)} 眩晕中，跳过行动`)
    }
  }
}

function currentActorWouldBe(state: BattleState, unit: Unit): boolean {
  for (const uid of state.queue) {
    const next = state.units.find((u) => u.uid === uid)
    if (!next || next.hp <= 0 || next.acted) continue
    return next.uid === unit.uid
  }
  return false
}

function newRound(state: BattleState): void {
  state.round += 1
  for (const unit of state.units) {
    if (unit.hp <= 0) continue
    const tick = unit.stagger[0] ?? 0
    unit.stagger = unit.stagger.slice(1)
    if (unit.stagger.length < 3) unit.stagger.push(0)
    if (tick > 0) {
      dealDamage(state, unit, unit, tick, '醉拳', {
        skipGuard: true,
        skipStagger: true,
        skipAmp: true,
        skipCrit: true,
      })
      pushLog(state, `${unitName(unit)} 摊还 ${tick} 点醉拳伤害`)
    }
    const nextDots: typeof unit.dots = []
    for (const dot of unit.dots) {
      dealDamage(state, unit, unit, dot.dmg, '持续伤害', { skipAmp: true, skipCrit: true })
      pushLog(state, `${unitName(unit)} 受到 ${dot.dmg} 点持续伤害`)
      if (dot.turns > 1 && unit.hp > 0) nextDots.push({ dmg: dot.dmg, turns: dot.turns - 1 })
    }
    unit.dots = nextDots
    const nextHots: typeof unit.hots = []
    for (const hot of unit.hots) {
      const caster = state.units.find((u) => u.uid === hot.fromUid) ?? unit
      healUnit(state, caster, unit, hot.heal, hot.skillName)
      if (hot.turns > 1 && unit.hp > 0) nextHots.push({ ...hot, turns: hot.turns - 1 })
    }
    unit.hots = nextHots
    if (unit.dmgAmpTurns > 0) {
      unit.dmgAmpTurns -= 1
      if (unit.dmgAmpTurns <= 0) unit.dmgAmp = 0
    }
    if (unit.takenAmpTurns > 0) {
      unit.takenAmpTurns -= 1
      if (unit.takenAmpTurns <= 0) unit.takenAmp = 0
    }
    if (unit.takenReduceTurns > 0) {
      unit.takenReduceTurns -= 1
      if (unit.takenReduceTurns <= 0) unit.takenReducePct = 0
    }
    if (unit.runeWeaponTurns > 0) unit.runeWeaponTurns -= 1
    if (unit.metaTurns > 0) unit.metaTurns -= 1
    if (unit.ebonTurns > 0) {
      unit.ebonTurns -= 1
      if (unit.ebonTurns <= 0) unit.ebonAtkPct = 0
    }
    if (unit.guardTurns > 0) unit.guardTurns -= 1
    if (unit.eleOverloadTurns > 0) unit.eleOverloadTurns -= 1
    if (unit.magiTurns > 0) {
      unit.magiTurns -= 1
      if (unit.magiTurns <= 0) hangingFloats.push(...detonateTouchOfTheMagi(state, unit))
    }
  }
  checkWinner(state)
  if (state.winner) return
  for (const unit of state.units) {
    unit.acted = false
    for (const id of Object.keys(unit.skillCd) as SkillId[]) {
      const left = unit.skillCd[id] ?? 0
      if (left <= 1) delete unit.skillCd[id]
      else unit.skillCd[id] = left - 1
    }
  }
  rebuildQueue(state)
  pushLog(state, `—— 第 ${state.round} 轮 ——`)
  beginTurn(state)
}

function checkWinner(state: BattleState): void {
  const playerAlive = livingHeroes(state.units, 'player').length > 0
  const aiAlive = livingHeroes(state.units, 'ai').length > 0
  if (!playerAlive && !aiAlive) state.winner = 'ai'
  else if (!playerAlive) state.winner = 'ai'
  else if (!aiAlive) state.winner = 'player'
}

function pushLog(state: BattleState, line: string): void {
  state.log.push(line)
  if (state.log.length > 300) state.log.splice(0, state.log.length - 300)
}

export interface FloatText {
  uid: string
  text: string
  kind: 'damage' | 'heal' | 'shield' | 'stun' | 'dot' | 'kill' | 'sp' | 'buff' | 'stagger' | 'share'
  crit?: boolean
  delay?: number
  tag?: string
}
