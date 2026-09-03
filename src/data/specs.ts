import type { EffectKind, Role, SkillDef, SkillId, SpecDef } from '../engine/types'
import { DEFAULT_CRIT, DEFAULT_CRIT_DMG, targetOf } from '../engine/types'

const COLORS: Record<string, string> = {
  warrior: '#C79C6E',
  paladin: '#F58CBA',
  hunter: '#ABD473',
  rogue: '#FFF569',
  priest: '#FFFFFF',
  deathknight: '#C41F3B',
  shaman: '#0070DE',
  mage: '#69CCF0',
  warlock: '#9482C9',
  monk: '#00FF96',
  druid: '#FF7D0A',
  demonhunter: '#A330C9',
  evoker: '#33937F',
}

const HP: Record<Role, number> = {
  tank: 160,
  healer: 110,
  dps: 100,
}

/** 攻击力。普攻约为 100% 攻击力，坦克略低、输出略高。 */
const ATK: Record<string, number> = {
  'warrior-arms': 14,
  'warrior-fury': 13,
  'warrior-prot': 10,
  'paladin-holy': 8,
  'paladin-prot': 10,
  'paladin-ret': 13,
  'hunter-bm': 12,
  'pet-devilsaur': 11,
  'pet-wolf': 10,
  'pet-nightsaber': 12,
  'hunter-mm': 13,
  'hunter-sv': 13,
  'rogue-assassination': 13,
  'rogue-outlaw': 13,
  'rogue-subtlety': 13,
  'priest-disc': 8,
  'priest-holy': 8,
  'priest-shadow': 12,
  'dk-blood': 10,
  'dk-frost': 13,
  'dk-unholy': 13,
  'shaman-ele': 10,
  'shaman-enh': 13,
  'shaman-resto': 8,
  'mage-arcane': 12,
  'mage-fire': 12,
  'mage-frost': 12,
  'warlock-aff': 11,
  'warlock-demo': 12,
  'warlock-destro': 12,
  'monk-brew': 10,
  'monk-ww': 13,
  'monk-mw': 8,
  'druid-balance': 12,
  'druid-feral': 13,
  'druid-guardian': 10,
  'druid-resto': 8,
  'dh-havoc': 13,
  'dh-vengeance': 10,
  'dh-devourer': 12,
  'evoker-dev': 12,
  'evoker-pres': 8,
  'evoker-aug': 11,
}
const SPEED: Record<string, number> = {
  'warrior-arms': 114,
  'warrior-fury': 118,
  'warrior-prot': 96,
  'paladin-holy': 108,
  'paladin-prot': 98,
  'paladin-ret': 116,
  'hunter-bm': 120,
  'pet-devilsaur': 104,
  'pet-wolf': 128,
  'pet-nightsaber': 134,
  'hunter-mm': 122,
  'hunter-sv': 119,
  'rogue-assassination': 129,
  'rogue-outlaw': 128,
  'rogue-subtlety': 132,
  'priest-disc': 106,
  'priest-holy': 107,
  'priest-shadow': 121,
  'dk-blood': 94,
  'dk-frost': 115,
  'dk-unholy': 113,
  'shaman-ele': 117,
  'shaman-enh': 124,
  'shaman-resto': 109,
  'mage-arcane': 123,
  'mage-fire': 125,
  'mage-frost': 111,
  'warlock-aff': 110,
  'warlock-demo': 112,
  'warlock-destro': 118,
  'monk-brew': 100,
  'monk-ww': 127,
  'monk-mw': 112,
  'druid-balance': 116,
  'druid-feral': 126,
  'druid-guardian': 97,
  'druid-resto': 110,
  'dh-havoc': 130,
  'dh-vengeance': 102,
  'dh-devourer': 121,
  'evoker-dev': 119,
  'evoker-pres': 104,
  'evoker-aug': 113,
}

function atkPct(pct: number): string {
  return `当前角色攻击力的 ${pct}%`
}

export const HAVOC_META_CHAOS_PCT = 70
export const HAVOC_META_BLADE_PCT = 55

function skillDesc(
  kind: EffectKind,
  value: number,
  extra: number | undefined,
  gainSp: number | undefined,
  note?: string,
): string {
  const hit = `${atkPct(value)}的伤害`
  const heal = `${atkPct(value)}的生命值`
  const shield = `${atkPct(value)}的护盾`
  let text = ''
  switch (kind) {
    case 'damage':
      text =
        extra != null && extra > value
          ? `造成${atkPct(value)}至${atkPct(extra)}的伤害`
          : `造成${hit}`
      break
    case 'aoe':
      text =
        extra != null && extra >= 2 && extra <= 6
          ? `对敌方全体造成 ${extra} 次${hit}`
          : `对敌方全体造成${hit}`
      break
    case 'heal':
      text = `为一名友方恢复${heal}`
      break
    case 'heal-aoe':
      text =
        extra != null && extra >= 2 && extra <= 6
          ? `分 ${extra} 段为己方全体恢复生命，每段${heal}`
          : `为己方全体恢复${heal}`
      break
    case 'shield':
      text = `加上${shield}`
      break
    case 'dot':
      text = `使目标在 ${extra ?? 3} 轮内每轮受到${hit}`
      break
    case 'stun':
      text = `造成${hit}并眩晕目标`
      break
    case 'execute':
      text = `造成${hit}；目标生命低于 35% 时额外造成${atkPct(extra ?? 0)}的伤害`
      break
    case 'gain-sp':
      text = `为队伍增加 ${value} 点技能点`
      break
    case 'infuse':
      text = `为一名友方加上${shield}，并使其伤害提高 ${extra ?? 30}%，持续 2 回合`
      break
    case 'stagger':
      text = `被动：受伤时只受 ${value}% 伤害，其余在下 3 回合内平均摊还`
      break
    case 'guard':
      text = `召唤玄牛，为队友分担 ${value}% 伤害，持续 ${extra ?? 2} 回合`
      break
    case 'rooted':
      text = `被动：每次释放技能有 ${extra ?? 20}% 几率触发升腾，对敌方全体造成${hit}`
      break
    case 'ascend':
      text = `对敌方全体造成${hit}，并获得升腾过载 ${extra ?? 2} 回合：每次释放闪电链或地震术后必定触发一次根深蒂固。过载期间不可再次升腾`
      break
    case 'havoc':
      text = '对一名敌人施加浩劫。此后烧尽和混乱之箭会同步攻击该目标'
      break
    case 'empower':
      text = `使一名友方立即获得回合，并在本回合伤害提高 ${value}%`
      break
    case 'sweep':
      text = `被动：致死打击、巨人打击和斩杀会额外对随机另一名敌人造成${hit}。此次额外伤害不触发降低治疗、提升受到伤害、斩杀击杀获得额外回合等效果`
      break
    case 'ardent':
      text = `永久提升自身攻击力和生命值 ${value}%。效果持续期间，每有一名队友阵亡，再永久提升 ${extra ?? 20}% 攻击力和生命值`
      break
    case 'hot':
      text = `为一名友方每回合恢复${heal}，持续 ${extra ?? 3} 回合`
      break
    case 'innervate':
      text = `使一名友方的下一个技能消耗变为 0 点`
      break
    case 'kill-command':
      text = `命令场上所有宠物对目标各造成其自身攻击力的 ${value}% 的伤害。没有宠物时无法使用`
      break
    case 'summon-pet':
      text = `随机召唤恐龙、狼或暗夜豹之一。宠物拥有独立生命、攻击、速度和技能，最多同时存在 ${value} 只`
      break
    case 'bestial-wrath':
      text = `使自身和所有宠物伤害提高 ${extra ?? 20}%，持续 3 回合；每只宠物对敌方全体造成其自身攻击力的 ${value}% 的伤害`
      break
    case 'deathstrike':
      text = `造成${hit}并恢复自身生命。当前生命越低，恢复量越高`
      break
    case 'amz':
      text = `使己方全体受到的伤害降低 ${value}%，持续 ${extra ?? 1} 回合`
      break
    case 'boneshield':
      text = `被动：灵界打击获得 ${value} 层骨盾，符文刃舞获得 ${extra ?? 5} 层。每受到一次伤害消耗 1 层，随机为一名友方恢复生命`
      break
    case 'rune-weapon':
      text = `立即获得 ${extra ?? 5} 层骨盾，自身伤害提高 ${value}%，持续 2 回合。持续期间灵界打击额外获得 1 层骨盾`
      break
    case 'missiles':
      text = `对一名敌人造成 ${extra ?? 5} 段伤害，每段为当前攻击力的 ${value}%`
      break
    case 'prismatic':
      text = `造成${hit}，并获得 1 层节能施法`
      break
    case 'clearcast':
      text = `被动：奥术飞弹有 ${extra ?? 20}% 几率获得 1 层节能施法，棱彩飞弹获得 1 层，大法师之触获得 2 层，最多 ${value} 层。若回合内已有节能施法，奥术飞弹会消耗全部层数，每层额外对 1 名敌人再释放一轮奥术飞弹（额外飞弹不会获得节能施法）`
      break
    case 'touch-magi':
      text = `标记一名敌人并立即造成${hit}。${extra ?? 2} 回合内累积你对其造成的伤害，结束后对敌方全体造成累计伤害的 80%。目标死亡则提前引爆`
      break
    case 'chaos-strike':
      text = `对一名敌人造成 ${extra ?? 2} 段伤害，每段为当前攻击力的 ${value}%。恶魔变形后变为毁灭，每段提高至 ${HAVOC_META_CHAOS_PCT}%`
      break
    case 'blade-dance':
      text = `对敌方全体造成 ${extra ?? 3} 段伤害，每段为当前攻击力的 ${value}%。恶魔变形后变为死亡横扫，每段提高至 ${HAVOC_META_BLADE_PCT}%`
      break
    case 'eye-beam':
      text = `对一名敌人造成 ${extra ?? 3} 段伤害，每段为当前攻击力的 ${value}%，并恢复造成伤害的生命值`
      break
    case 'metamorphosis':
      text = `对一名敌人造成眩晕和${hit}，并强化混乱打击与刃舞，持续 ${extra ?? 2} 回合。变形期间不可再次施放`
      break
    case 'eruption':
      text = `造成${hit}。若黑檀之力正在持续，使其持续时间增加 1 回合`
      break
    case 'prescience':
      text = `被动：增辉存活时，己方全体暴击几率提高 ${value}%`
      break
    case 'ebon-might':
      text = `使己方全体攻击力提高 ${value}%，持续 ${extra ?? 2} 回合`
      break
    case 'deep-breath':
      text = `对敌方全体造成${hit}，并使其受到的下一次攻击伤害提高 ${extra ?? 50}%`
      break
    default:
      text = `造成${hit}`
  }
  if (gainSp) text += `，回复 ${gainSp} 点技能点`
  if (note) text += `。${note}`
  return text
}

function sk(
  id: SkillId,
  name: string,
  icon: string,
  cost: number,
  kind: EffectKind,
  value: number,
  extra?: number,
  gainSp?: number,
  note?: string,
): SkillDef {
  return {
    id,
    name,
    icon,
    cost,
    gainSp,
    passive: kind === 'stagger' || kind === 'rooted' || kind === 'sweep' || kind === 'boneshield' || kind === 'clearcast' || kind === 'prescience',
    effect: extra === undefined ? { kind, value } : { kind, value, extra },
    target: targetOf(kind),
    desc: skillDesc(kind, value, extra, gainSp, note),
  }
}

function spec(
  id: string,
  classId: string,
  className: string,
  specName: string,
  role: Role,
  icon: string,
  skills: [SkillDef, SkillDef, SkillDef, SkillDef],
  hp?: number,
): SpecDef {
  return {
    id,
    classId,
    className,
    specName,
    role,
    color: COLORS[classId],
    icon,
    maxHp: hp ?? HP[role],
    speed: SPEED[id] ?? 110,
    atk: ATK[id] ?? (role === 'tank' ? 10 : role === 'healer' ? 8 : 12),
    crit: DEFAULT_CRIT,
    critDmg: DEFAULT_CRIT_DMG,
    skills,
  }
}

export const SPECS: SpecDef[] = [
  spec('warrior-arms', 'warrior', '战士', '武器', 'dps', 'ability_warrior_savageblow', [
    sk('aa', '致死打击', 'ability_warrior_savageblow', 0, 'damage', 100, undefined, 1, '目标受到的治疗效果降低 50%'),
    sk('s1', '巨人打击', 'ability_warrior_colossussmash', 2, 'damage', 157, undefined, undefined, '使目标受到的伤害提高 30%，持续 2 回合'),
    sk('s2', '横扫攻击', 'ability_rogue_slicedice', 0, 'sweep', 80),
    sk('s3', '斩杀', 'inv_sword_48', 4, 'execute', 257, 129, undefined, '斩杀击杀敌人时获得一个额外回合并使你的下一个斩杀费用降低为 0 点'),
  ], 108),
  spec('warrior-fury', 'warrior', '战士', '狂怒', 'dps', 'ability_warrior_innerrage', [
    sk('aa', '嗜血', 'spell_nature_bloodlust', 0, 'damage', 100, undefined, 1),
    sk('s1', '怒击', 'warrior_wild_strike', 1, 'damage', 185),
    sk('s2', '旋风斩', 'ability_whirlwind', 1, 'aoe', 108),
    sk('s3', '暴怒', 'spell_shadow_unholyfrenzy', 3, 'damage', 323),
  ], 105),
  spec('warrior-prot', 'warrior', '战士', '防护', 'tank', 'ability_warrior_defensivestance', [
    sk('aa', '盾牌猛击', 'inv_shield_05', 0, 'damage', 100, undefined, 1),
    sk('s1', '复仇', 'ability_warrior_revenge', 1, 'damage', 160),
    sk('s2', '盾墙', 'ability_warrior_shieldwall', 1, 'shield', 320),
    sk('s3', '震荡波', 'ability_warrior_shockwave', 3, 'stun', 180),
  ]),
  spec('paladin-holy', 'paladin', '圣骑士', '神圣', 'healer', 'spell_holy_holybolt', [
    sk('aa', '十字军打击', 'spell_holy_crusaderstrike', 0, 'damage', 100, undefined, 1),
    sk('s1', '圣光术', 'spell_holy_holybolt', 1, 'heal', 350),
    sk('s2', '圣光灌注', 'spell_holy_powerinfusion', 0, 'gain-sp', 2),
    sk('s3', '圣光普照', 'spell_holy_divineprovidence', 3, 'heal-aoe', 275),
  ]),
  spec('paladin-prot', 'paladin', '圣骑士', '防护', 'tank', 'ability_paladin_shieldofthetemplar', [
    sk('aa', '审判', 'spell_holy_righteousfury', 0, 'damage', 100, undefined, 1),
    sk('s1', '正义盾击', 'ability_paladin_shieldofvengeance', 1, 'damage', 160, 10, undefined, '为己方全体恢复当前角色攻击力的 10% 的生命值'),
    sk('s2', '复仇者之盾', 'spell_holy_avengersshield', 2, 'aoe', 33, undefined, undefined, '盾牌弹射敌方所有目标'),
    sk('s3', '炽热防御者', 'ability_paladin_veneration', 5, 'ardent', 40, 20),
  ]),
  spec('paladin-ret', 'paladin', '圣骑士', '惩戒', 'dps', 'spell_holy_auraoflight', [
    sk('aa', '十字军打击', 'spell_holy_crusaderstrike', 0, 'damage', 100, undefined, 1),
    sk('s1', '审判', 'spell_holy_righteousfury', 1, 'damage', 169),
    sk('s2', '神圣风暴', 'spell_holy_divineprovidence', 1, 'aoe', 123),
    sk('s3', '最终审判', 'spell_holy_blessedresillience', 3, 'damage', 338),
  ], 108),
  spec('hunter-bm', 'hunter', '猎人', '野兽控制', 'dps', 'ability_hunter_bestialdiscipline', [
    sk('aa', '眼镜蛇射击', 'ability_hunter_cobrashot', 0, 'damage', 100, undefined, 1),
    sk('s1', '杀戮命令', 'ability_hunter_killcommand', 1, 'kill-command', 140),
    sk('s2', '召唤动物伙伴', 'ability_hunter_beastcall', 2, 'summon-pet', 3),
    sk('s3', '狂野怒火', 'ability_druid_ferociousbite', 3, 'bestial-wrath', 90, 20),
  ]),
  spec('hunter-mm', 'hunter', '猎人', '射击', 'dps', 'ability_hunter_focusedaim', [
    sk('aa', '稳固射击', 'ability_hunter_steadyshot', 0, 'damage', 100, undefined, 1),
    sk('s1', '瞄准射击', 'inv_spear_07', 1, 'damage', 192),
    sk('s2', '多重射击', 'ability_upgrademoonglaive', 1, 'aoe', 115),
    sk('s3', '百发百中', 'ability_hunter_assassinate2', 3, 'execute', 292, 123),
  ]),
  spec('hunter-sv', 'hunter', '猎人', '生存', 'dps', 'ability_hunter_camouflage', [
    sk('aa', '猛禽一击', 'ability_hunter_raptorstrike', 0, 'damage', 100, undefined, 1),
    sk('s1', '野性打击', 'spell_druid_feralchargecat', 1, 'damage', 169),
    sk('s2', '爆炸陷阱', 'spell_fire_selfdestruct', 1, 'aoe', 115),
    sk('s3', '侧翼打击', 'ability_hunter_invigeration', 3, 'damage', 308),
  ], 105),
  spec('rogue-assassination', 'rogue', '潜行者', '奇袭', 'dps', 'ability_rogue_deadlybrew', [
    sk('aa', '毁伤', 'ability_rogue_disembowel', 0, 'damage', 100, undefined, 1),
    sk('s1', '毒伤', 'ability_rogue_envelopingshadows', 1, 'damage', 169),
    sk('s2', '割裂', 'ability_rogue_rupture', 1, 'dot', 77, 3),
    sk('s3', '毒刃', 'ability_rogue_shadowstrikes', 3, 'damage', 323),
  ]),
  spec('rogue-outlaw', 'rogue', '潜行者', '狂徒', 'dps', 'ability_rogue_waylay', [
    sk('aa', '军刀猛刺', 'inv_sword_97', 0, 'damage', 100, undefined, 1),
    sk('s1', '手枪射击', 'ability_rogue_pistolshot', 1, 'damage', 169, undefined, undefined, '命运骨骰后下一次不耗技能点，并获得额外回合'),
    sk('s2', '正中眉心', 'ability_cheapshot', 2, 'stun', 108),
    sk('s3', '命运骨骰', 'inv_misc_dice_02', 3, 'damage', 231, 462, undefined, '下一次手枪射击不耗技能点且获得额外回合'),
  ]),
  spec('rogue-subtlety', 'rogue', '潜行者', '敏锐', 'dps', 'ability_stealth', [
    sk('aa', '背刺', 'ability_backstab', 0, 'damage', 100, undefined, 1),
    sk('s1', '刺骨', 'ability_rogue_eviscerate', 1, 'damage', 185),
    sk('s2', '肾击', 'ability_rogue_kidneyshot', 1, 'stun', 92),
    sk('s3', '黑火药', 'spell_fire_incinerate', 3, 'aoe', 154),
  ]),
  spec('priest-disc', 'priest', '牧师', '戒律', 'healer', 'spell_holy_powerwordshield', [
    sk('aa', '惩击', 'spell_holy_holysmite', 0, 'damage', 100, undefined, 1),
    sk('s1', '苦修', 'spell_holy_penance', 1, 'heal', 300),
    sk('s2', '真言术：盾', 'spell_holy_powerwordshield', 1, 'shield', 350),
    sk('s3', '光晕', 'ability_priest_halo', 3, 'heal-aoe', 250),
  ]),
  spec('priest-holy', 'priest', '牧师', '神圣', 'healer', 'spell_holy_guardianspirit', [
    sk('aa', '惩击', 'spell_holy_holysmite', 0, 'damage', 100, undefined, 1),
    sk('s1', '快速治疗', 'spell_holy_flashheal', 1, 'heal', 325),
    sk('s2', '能量灌注', 'spell_holy_powerinfusion', 2, 'empower', 20, 1),
    sk('s3', '神圣赞美诗', 'spell_holy_divineprovidence', 3, 'heal-aoe', 300),
  ]),
  spec('priest-shadow', 'priest', '牧师', '暗影', 'dps', 'spell_shadow_shadowwordpain', [
    sk('aa', '心灵震爆', 'spell_shadow_unholyfrenzy', 0, 'damage', 100, undefined, 1),
    sk('s1', '暗言术：灭', 'spell_shadow_demonicfortitude', 1, 'execute', 167, 167),
    sk('s2', '暗言术：痛', 'spell_shadow_shadowwordpain', 1, 'dot', 75, 3),
    sk('s3', '虚空爆发', 'spell_priest_void-blast', 3, 'damage', 333),
  ], 95),
  spec('dk-blood', 'deathknight', '死亡骑士', '鲜血', 'tank', 'spell_deathknight_bloodpresence', [
    sk('aa', '灵界打击', 'spell_deathknight_butcher2', 0, 'deathstrike', 100, undefined, 1),
    sk('s1', '反魔法领域', 'spell_deathknight_antimagiczone', 1, 'amz', 30, 1),
    sk('s2', '骨盾', 'ability_deathknight_boneshield', 0, 'boneshield', 2, 5),
    sk('s3', '符文刃舞', 'inv_sword_07', 3, 'rune-weapon', 30, 5),
  ]),
  spec('dk-frost', 'deathknight', '死亡骑士', '冰霜', 'dps', 'spell_deathknight_frostpresence', [
    sk('aa', '湮没', 'spell_deathknight_classicon', 0, 'damage', 100, undefined, 1),
    sk('s1', '冰霜打击', 'spell_deathknight_empowerruneblade2', 1, 'damage', 177),
    sk('s2', '凛风冲击', 'spell_frost_arcticwinds', 1, 'aoe', 115),
    sk('s3', '冰霜之柱', 'ability_deathknight_pillaroffrost', 3, 'damage', 323),
  ]),
  spec('dk-unholy', 'deathknight', '死亡骑士', '邪恶', 'dps', 'spell_deathknight_unholypresence', [
    sk('aa', '天灾打击', 'spell_deathknight_scourgestrike', 0, 'damage', 100, undefined, 1),
    sk('s1', '脓疮打击', 'spell_shadow_bloodboil', 1, 'damage', 169),
    sk('s2', '恶性瘟疫', 'spell_shadow_contagion', 1, 'dot', 77, 3),
    sk('s3', '亡者大军', 'spell_deathknight_armyofthedead', 3, 'aoe', 138),
  ]),
  spec('shaman-ele', 'shaman', '萨满祭司', '元素', 'dps', 'spell_nature_lightning', [
    sk('aa', '闪电链', 'spell_nature_chainlightning', 0, 'aoe', 100, undefined, 1),
    sk('s1', '根深蒂固', 'inv_misc_herb_liferoot_stem', 0, 'rooted', 120, 20),
    sk('s2', '地震术', 'spell_shaman_earthquake', 2, 'aoe', 70, 3),
    sk('s3', '升腾', '8026697', 3, 'ascend', 160, 2),
  ], 95),
  spec('shaman-enh', 'shaman', '萨满祭司', '增强', 'dps', 'spell_shaman_improvedstormstrike', [
    sk('aa', '风暴打击', 'ability_shaman_stormstrike', 0, 'damage', 100, undefined, 1),
    sk('s1', '熔岩猛击', 'ability_shaman_lavalash', 1, 'damage', 177),
    sk('s2', '烈焰震击', 'spell_fire_flameshock', 1, 'dot', 62, 3),
    sk('s3', '升腾', 'spell_fire_elementaldevastation', 3, 'damage', 308),
  ], 108),
  spec('shaman-resto', 'shaman', '萨满祭司', '恢复', 'healer', 'spell_nature_magicimmunity', [
    sk('aa', '闪电箭', 'spell_nature_lightning', 0, 'damage', 100, undefined, 1),
    sk('s1', '治疗波', 'spell_nature_healingwavelesser', 1, 'heal', 325),
    sk('s2', '法力之潮', 'spell_frost_summonwaterelemental', 0, 'gain-sp', 2),
    sk('s3', '治疗之潮', 'ability_shaman_healingtide', 3, 'heal-aoe', 275),
  ]),
  spec('mage-arcane', 'mage', '法师', '奥术', 'dps', 'spell_holy_magicalsentry', [
    sk('aa', '奥术飞弹', 'spell_nature_starfall', 0, 'missiles', 20, 5, 1),
    sk('s1', '棱彩飞弹', 'inv12_apextalent_mage_touchofthearchmage', 1, 'prismatic', 160),
    sk('s2', '节能施法', 'spell_shadow_manaburn', 0, 'clearcast', 3, 20),
    sk('s3', '大法师之触', 'inv_ability_mage_radiantspark', 3, 'touch-magi', 230, 2),
  ], 95),
  spec('mage-fire', 'mage', '法师', '火焰', 'dps', 'spell_fire_firebolt02', [
    sk('aa', '火球术', 'spell_fire_flamebolt', 0, 'damage', 100, undefined, 1),
    sk('s1', '炎爆术', 'spell_fire_fireball02', 1, 'damage', 208),
    sk('s2', '龙息术', 'inv_misc_head_dragon_01', 1, 'aoe', 117),
    sk('s3', '燃烧', 'spell_fire_sealoffire', 3, 'damage', 367),
  ], 95),
  spec('mage-frost', 'mage', '法师', '冰霜', 'dps', 'spell_frost_frostbolt02', [
    sk('aa', '寒冰箭', 'spell_frost_frostbolt02', 0, 'damage', 100, undefined, 1),
    sk('s1', '冰枪术', 'spell_frost_frostblast', 1, 'damage', 183),
    sk('s2', '冰霜新星', 'spell_frost_frostnova', 1, 'stun', 83),
    sk('s3', '暴风雪', 'spell_frost_icestorm', 3, 'aoe', 167),
  ], 95),
  spec('warlock-aff', 'warlock', '术士', '痛苦', 'dps', 'spell_shadow_deathcoil', [
    sk('aa', '暗影箭', 'spell_shadow_shadowbolt', 0, 'damage', 100, undefined, 1),
    sk('s1', '痛苦无常', 'spell_shadow_unstableaffliction_3', 1, 'damage', 182),
    sk('s2', '腐蚀术', 'spell_shadow_abominationexplosion', 1, 'dot', 91, 3),
    sk('s3', '痛楚', 'spell_shadow_curseofsargeras', 3, 'damage', 345),
  ], 95),
  spec('warlock-demo', 'warlock', '术士', '恶魔学识', 'dps', 'spell_shadow_metamorphosis', [
    sk('aa', '暗影箭', 'spell_shadow_shadowbolt', 0, 'damage', 100, undefined, 1),
    sk('s1', '古尔丹之手', 'ability_warlock_handofguldan', 1, 'damage', 183),
    sk('s2', '恶魔之火', 'spell_fire_fireball', 1, 'aoe', 117),
    sk('s3', '召唤暴君', 'ability_warlock_demonicempowerment', 3, 'damage', 350),
  ], 100),
  spec('warlock-destro', 'warlock', '术士', '毁灭', 'dps', 'spell_shadow_rainoffire', [
    sk('aa', '烧尽', 'spell_fire_burnout', 0, 'damage', 100, undefined, 1, '使下一个混乱之箭伤害提高 20%，最多叠加 2 次'),
    sk('s1', '混乱之箭', 'ability_warlock_chaosbolt', 2, 'damage', 417, undefined, undefined, '烧尽叠加的增伤在命中时结算并清空'),
    sk('s2', '浩劫', 'ability_warlock_baneofhavoc', 0, 'havoc', 0),
    sk('s3', '火焰之雨', 'spell_shadow_rainoffire', 4, 'aoe', 83, 4),
  ], 95),
  spec('monk-brew', 'monk', '武僧', '酿酒', 'tank', 'spell_monk_brewmaster_spec', [
    sk('aa', '醉酿投', 'inv_misc_beer_06', 0, 'damage', 100, undefined, 1),
    sk('s1', '天神灌注', 'ability_monk_tigereyebrandy', 2, 'infuse', 320, 30),
    sk('s2', '醉拳', 'monk_stance_drunkenox', 0, 'stagger', 50),
    sk('s3', '玄牛下凡', 'spell_monk_brewmaster_spec', 3, 'guard', 50, 2),
  ]),
  spec('monk-ww', 'monk', '武僧', '踏风', 'dps', 'spell_monk_windwalker_spec', [
    sk('aa', '猛虎掌', 'ability_monk_tigerpalm', 0, 'damage', 100, undefined, 1),
    sk('s1', '旭日东升踢', 'ability_monk_risingsunkick', 1, 'damage', 177),
    sk('s2', '神鹤引项踢', 'ability_monk_cranekick_new', 1, 'aoe', 123),
    sk('s3', '升龙霸', 'ability_monk_flyingdragonkick', 3, 'damage', 323),
  ], 105),
  spec('monk-mw', 'monk', '武僧', '织雾', 'healer', 'spell_monk_mistweaver_spec', [
    sk('aa', '猛虎掌', 'ability_monk_tigerpalm', 0, 'damage', 100, undefined, 1),
    sk('s1', '复苏之雾', 'ability_monk_renewingmists', 1, 'heal', 300),
    sk('s2', '法力茶', 'monk_ability_cherrymanatea', 0, 'gain-sp', 2),
    sk('s3', '作茧缚命', 'ability_monk_chicocoon', 3, 'heal-aoe', 275),
  ]),
  spec('druid-balance', 'druid', '德鲁伊', '平衡', 'dps', 'spell_nature_starfall', [
    sk('aa', '愤怒', 'spell_nature_wrathv2', 0, 'damage', 100, undefined, 1),
    sk('s1', '星涌术', 'ability_druid_starfall', 1, 'damage', 200),
    sk('s2', '月火术', 'spell_nature_starfall', 1, 'dot', 67, 3),
    sk('s3', '星辰坠落', 'ability_druid_starfall', 3, 'aoe', 167),
  ], 95),
  spec('druid-feral', 'druid', '德鲁伊', '野性', 'dps', 'ability_druid_catform', [
    sk('aa', '撕碎', 'spell_shadow_vampiricaura', 0, 'damage', 100, undefined, 1),
    sk('s1', '凶猛撕咬', 'ability_druid_ferociousbite', 1, 'execute', 169, 123),
    sk('s2', '斜掠', 'ability_druid_disembowel', 1, 'dot', 69, 3),
    sk('s3', '狂暴', 'ability_druid_berserk', 3, 'damage', 323),
  ], 105),
  spec('druid-guardian', 'druid', '德鲁伊', '守护', 'tank', 'ability_racial_bearform', [
    sk('aa', '裂伤', 'ability_druid_mangle2', 0, 'damage', 100, undefined, 1),
    sk('s1', '重殴', 'inv_misc_monsterclaw_03', 1, 'damage', 160),
    sk('s2', '铁鬃', 'ability_druid_ironfur', 1, 'shield', 300),
    sk('s3', '生存本能', 'ability_druid_tigersroar', 3, 'shield', 400),
  ]),
  spec('druid-resto', 'druid', '德鲁伊', '恢复', 'healer', 'spell_nature_healingtouch', [
    sk('aa', '愤怒', 'spell_nature_wrathv2', 0, 'damage', 100, undefined, 1),
    sk('s1', '回春术', 'spell_nature_rejuvenation', 1, 'hot', 100, 3),
    sk('s2', '激活', 'spell_nature_lightning', 1, 'innervate', 0),
    sk('s3', '宁静', 'spell_nature_tranquility', 3, 'heal-aoe', 100, 3),
  ]),
  spec('dh-havoc', 'demonhunter', '恶魔猎手', '浩劫', 'dps', 'ability_demonhunter_specdps', [
    sk('aa', '混乱打击', 'ability_demonhunter_chaosstrike', 0, 'chaos-strike', 50, 2, 1),
    sk('s1', '刃舞', 'ability_demonhunter_bladedance', 2, 'blade-dance', 40, 3),
    sk('s2', '眼棱', 'ability_demonhunter_eyebeam', 2, 'eye-beam', 70, 3),
    sk('s3', '恶魔变形', 'ability_demonhunter_metamorphasisdps', 4, 'metamorphosis', 180, 2),
  ], 105),
  spec('dh-vengeance', 'demonhunter', '恶魔猎手', '复仇', 'tank', 'ability_demonhunter_spectank', [
    sk('aa', '裂魂', 'ability_demonhunter_soulcleave', 0, 'damage', 100, undefined, 1),
    sk('s1', '灵魂裂劈', 'ability_demonhunter_soulcleave', 1, 'damage', 160),
    sk('s2', '恶魔尖刺', 'ability_demonhunter_demonspikes', 1, 'shield', 280),
    sk('s3', '恶魔变形', 'ability_demonhunter_metamorphasistank', 3, 'aoe', 180),
  ]),
  spec('dh-devourer', 'demonhunter', '恶魔猎手', '噬灭', 'dps', 'spell_priest_void-blast', [
    sk('aa', '吞噬', 'spell_shadow_soulleech_2', 0, 'damage', 100, undefined, 1),
    sk('s1', '收割', 'ability_ironmaidens_convulsiveshadows', 1, 'damage', 192),
    sk('s2', '虚空射线', 'spell_priest_voidsear', 1, 'aoe', 125),
    sk('s3', '坍缩之星', 'spell_priest_void-blast', 3, 'damage', 367),
  ], 100),
  spec('evoker-dev', 'evoker', '唤魔师', '湮灭', 'dps', 'classicon_evoker_devastation', [
    sk('aa', '活化烈焰', 'ability_evoker_livingflame', 0, 'damage', 100, undefined, 1),
    sk('s1', '碧蓝打击', 'ability_evoker_azurestrike', 1, 'damage', 192),
    sk('s2', '火焰吐息', 'ability_evoker_firebreath', 1, 'aoe', 125),
    sk('s3', '永恒升腾', 'ability_evoker_eternitysurge', 3, 'damage', 367),
  ], 98),
  spec('evoker-pres', 'evoker', '唤魔师', '恩护', 'healer', 'classicon_evoker_preservation', [
    sk('aa', '活化烈焰', 'ability_evoker_livingflame', 0, 'damage', 100, undefined, 1),
    sk('s1', '回响', 'ability_evoker_echo', 1, 'heal', 325),
    sk('s2', '魔力之源', 'ability_evoker_sourceofmagic', 0, 'gain-sp', 2),
    sk('s3', '梦境吐息', 'ability_evoker_dreambreath', 3, 'heal-aoe', 300),
  ]),
  spec('evoker-aug', 'evoker', '唤魔师', '增辉', 'dps', 'classicon_evoker_augmentation', [
    sk('aa', '喷发', 'ability_evoker_eruption', 0, 'eruption', 100, undefined, 1),
    sk('s1', '先知先觉', 'ability_evoker_prescience', 0, 'prescience', 20),
    sk('s2', '黑檀之力', 'ability_evoker_ebonmight', 2, 'ebon-might', 30, 2),
    sk('s3', '深呼吸', 'ability_evoker_deepbreath', 3, 'deep-breath', 80, 50),
  ], 105),
]

export const PET_SPECS: SpecDef[] = [
  spec('pet-devilsaur', 'hunter', '召唤物', '恐龙', 'dps', 'ability_hunter_pet_devilsaur', [
    sk('aa', '撕咬', 'ability_druid_ferociousbite', 0, 'damage', 100, undefined, 1),
    sk('s1', '践踏', 'ability_warstomp', 1, 'aoe', 85),
    sk('s2', '厚皮', 'inv_misc_pelt_bear_03', 1, 'shield', 180),
    sk('s3', '蛮力冲撞', 'ability_hunter_pet_devilsaur', 2, 'damage', 210),
  ], 72),
  spec('pet-wolf', 'hunter', '召唤物', '狼', 'dps', 'ability_hunter_pet_wolf', [
    sk('aa', '撕咬', 'ability_druid_ferociousbite', 0, 'damage', 100, undefined, 1),
    sk('s1', '凶猛撕咬', 'ability_druid_ferociousbite', 1, 'damage', 170),
    sk('s2', '嚎叫', 'ability_hunter_pet_wolf', 1, 'shield', 120),
    sk('s3', '乱爪', 'spell_nature_spiritwolf', 2, 'aoe', 100),
  ], 58),
  spec('pet-nightsaber', 'hunter', '召唤物', '暗夜豹', 'dps', 'ability_hunter_pet_cat', [
    sk('aa', '爪击', 'ability_druid_rake', 0, 'damage', 100, undefined, 1),
    sk('s1', '突袭', 'ability_hunter_catlikereflexes', 1, 'damage', 185),
    sk('s2', '斜掠', 'ability_druid_disembowel', 1, 'dot', 65, 3),
    sk('s3', '扑杀', 'ability_druid_supriseattack', 2, 'damage', 240),
  ], 52),
]

export const PET_POOL = ['pet-devilsaur', 'pet-wolf', 'pet-nightsaber'] as const
export const MAX_PETS = 3

export const CLASS_ORDER = [
  'warrior',
  'paladin',
  'hunter',
  'rogue',
  'priest',
  'deathknight',
  'shaman',
  'mage',
  'warlock',
  'monk',
  'druid',
  'demonhunter',
  'evoker',
] as const

export const SPEC_MAP = Object.fromEntries([...SPECS, ...PET_SPECS].map((s) => [s.id, s])) as Record<string, SpecDef>

export function getSpec(id: string): SpecDef {
  const specDef = SPEC_MAP[id]
  if (!specDef) throw new Error(`未知专精: ${id}`)
  return specDef
}

export function presentSkill(
  skill: SkillDef,
  unit?: { specId: string; metaTurns: number } | null,
): SkillDef {
  if (!unit || unit.specId !== 'dh-havoc' || unit.metaTurns <= 0) return skill
  const hits = skill.effect.extra
  if (skill.effect.kind === 'chaos-strike') {
    return {
      ...skill,
      name: '毁灭',
      icon: 'inv_glaive_1h_npc_d_02',
      desc: `对一名敌人造成 ${hits ?? 2} 段伤害，每段为当前攻击力的 ${HAVOC_META_CHAOS_PCT}%${
        skill.gainSp ? `，回复 ${skill.gainSp} 点技能点` : ''
      }`,
    }
  }
  if (skill.effect.kind === 'blade-dance') {
    return {
      ...skill,
      name: '死亡横扫',
      icon: 'inv_glaive_1h_artifactaldrochi_d_02dual',
      desc: `对敌方全体造成 ${hits ?? 3} 段伤害，每段为当前攻击力的 ${HAVOC_META_BLADE_PCT}%`,
    }
  }
  return skill
}

export function specsByClass(): { classId: string; className: string; color: string; specs: SpecDef[] }[] {
  return CLASS_ORDER.map((classId) => {
    const specs = SPECS.filter((s) => s.classId === classId)
    return { classId, className: specs[0].className, color: specs[0].color, specs }
  })
}

export const ROLE_LABEL: Record<Role, string> = {
  tank: '坦克',
  healer: '治疗',
  dps: '输出',
}
