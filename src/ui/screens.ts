import { SPEC_SKINS, resolveSkin, specExtraSkin } from '../data/art'
import { ROLE_LABEL, SPECS, getSpec, presentSkill, specsByClass } from '../data/specs'
import { aiPickAction, aiPickDraft, pickAction } from '../engine/ai'
import {
  applyAction,
  canUseSkill,
  currentActor,
  queuedUnits,
  skipCurrent,
  teamSp,
  teamSpMeter,
  nextSpGrant,
  validTargets,
  createBattle,
  skillCost,
  executeReady,
  matchHasArms,
  petsOf,
  effectiveAtk,
  effectiveCrit,
  prescienceBonus,
  type FloatText,
} from '../engine/battle'
import type { BattleState, Side, SkillDef, SkillId, Unit } from '../engine/types'
import { SP_METER_MAX, wowIcon } from '../engine/types'
import { escapeHtml, renderBattleCard, renderDraftCard, roleIconSvg, specArtImg } from './card'
import { playSkillSfx } from './sfx'
import { playBattleFx, setFxPaused, stopBattleFx, interruptBattleFx } from '../fx/play'
import { adminHtml, bindAdmin } from './admin'
import { playOxShare, playStaggerHit } from '../fx/brew'

type Screen = 'title' | 'draft' | 'battle' | 'result' | 'admin'
const ACTION_PAUSE_MS = 3000
const ACTION_PAUSE_FAST_MS = 1500

const CLASS_LINE: Record<string, string> = {
  warrior: '以血换血，以盾换命。',
  paladin: '圣光既是裁决，也是庇护。',
  hunter: '猎物只有一次机会，猎人有无数支箭。',
  rogue: '刀锋与火枪之间，只需一次失神。',
  priest: '信仰能治愈伤口，也能撕开心智。',
  deathknight: '亡者不需要呼吸。',
  shaman: '风火水土听从号令。',
  mage: '奥术、火焰与寒冰，皆是法则。',
  warlock: '以灵魂为薪，换取毁灭。',
  monk: '醉意与拳意，本是同途。',
  druid: '自然从不只提供一种形态。',
  demonhunter: '以魔制魔，以眼还眼。',
  evoker: '龙族吐息，改写战场。',
}

interface SkillCue {
  actorUid: string
  specId: string
  skillId: SkillId
  skillName: string
  skillIcon: string
  color: string
  side: Side
}

const app = () => document.querySelector<HTMLElement>('#app')!

let screen: Screen = 'title'
let draftPicks: string[] = []
let battle: BattleState | null = null
let selectedUid: string | null = null
let selectedSkill: SkillId | null = null
let inspectedUid: string | null = null
let viewedSkill: SkillId | null = null
let viewPinned = false
let floats: FloatText[] = []
let busy = false
let lastCue: SkillCue | null = null
let pauseTimer = 0
let pauseGen = 0
let logStickToEnd = true
let logScrollTop = 0
let fastMode = false
let paused = false
let autoPlay = false
let dockHidden = false
let pendingResume = false
let lastTargetUid: string | null = null
let pendingFloats: FloatText[] = []
let lastProcAscend = false
let lastProcSweep = false
let lastSweepUid: string | null = null
let lastExecuteLow = false
let lastExecuteKill = false
let lastChaosStacks = 0
let lastHavocUid: string | null = null
let lastPetUids: string[] = []
let lastSummonedUid: string | null = null
let lastExtraUids: string[] = []
let lastMetaForm = false
let lastEbonExtend = false
let draftViewedId: string | null = null
let draftScrollY = 0
const SKIN_STORE = 'wow-spec-skins'
let draftSkins: Record<string, string> = loadDraftSkins()

function loadDraftSkins(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SKIN_STORE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [specId, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && SPEC_SKINS[specId] === value) out[specId] = value
    }
    return out
  } catch {
    return {}
  }
}

function saveDraftSkins(): void {
  localStorage.setItem(SKIN_STORE, JSON.stringify(draftSkins))
}

function specSkin(specId: string): string {
  return resolveSkin(specId, draftSkins[specId])
}

export function startApp(): void {
  if (location.hash === '#admin') screen = 'admin'
  render()
}

function render(): void {
  const prevLog = app().querySelector<HTMLElement>('.battle-log-body')
  if (prevLog) {
    logStickToEnd = prevLog.scrollHeight - prevLog.scrollTop - prevLog.clientHeight < 28
    logScrollTop = prevLog.scrollTop
  }
  const grid = app().querySelector('.draft-scroller')
  if (grid) draftScrollY = grid.scrollTop
  const canvas = document.querySelector<HTMLCanvasElement>('.fx-canvas')
  const root = app()
  if (screen === 'title') root.innerHTML = titleHtml()
  else if (screen === 'draft') root.innerHTML = draftHtml()
  else if (screen === 'battle') root.innerHTML = battleHtml()
  else if (screen === 'admin') root.innerHTML = adminHtml()
  else root.innerHTML = resultHtml()
  if (canvas && screen === 'battle') {
    document.querySelector('.battle-screen')?.appendChild(canvas)
  }
  bind()
  if (screen === 'admin') bindAdmin(root, render)
  kickSkinVideos()
  restoreLogScroll()
  if (screen === 'draft') {
    const main = app().querySelector('.draft-scroller')
    if (main) main.scrollTop = draftScrollY
  }
  if (floats.length) playFloats()
}

let skinVideoObserver: IntersectionObserver | null = null

function kickSkinVideos(): void {
  skinVideoObserver?.disconnect()
  const videos = [...app().querySelectorAll<HTMLVideoElement>('video.wow-icon')]
  if (!videos.length) {
    skinVideoObserver = null
    return
  }
  skinVideoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement
        if (entry.isIntersecting) {
          video.muted = true
          video.playsInline = true
          void video.play().catch(() => {})
        } else {
          video.pause()
        }
      }
    },
    { rootMargin: '64px' },
  )
  for (const video of videos) {
    video.muted = true
    video.playsInline = true
    video.preload = 'none'
    skinVideoObserver.observe(video)
  }
}

function titleHtml(): string {
  return `
    <div class="screen title-screen">
      <div class="title-mark">WORLD OF WARCRAFT</div>
      <h1>专精卡牌对战</h1>
      <p class="lead">5 对 5。技能点全队共用，速度决定出手顺序。友方每行动一次为充能条填一格，满格后再行动获得技能点。普攻仍回复技能点。</p>
      <div class="title-actions">
        <button type="button" class="btn gold" data-go="draft">开始征召</button>
        <button type="button" class="btn ghost" data-go="admin">后台管理</button>
      </div>
      <p class="disclaimer">粉丝向个人作品。图标来自 Wowhead，与暴雪娱乐无关。</p>
    </div>
  `
}

function draftHtml(): string {
  const groups = specsByClass()
    .map((group) => {
      const cards = group.specs
        .map((s) => renderDraftCard(s, draftPicks.includes(s.id), s.id === draftViewedId, specSkin(s.id)))
        .join('')
      return `
        <section class="class-group" id="class-${group.classId}">
          <h3 style="--class:${group.color}"><i></i>${group.className}</h3>
          <div class="card-row">${cards}</div>
        </section>
      `
    })
    .join('')

  const picked = draftPicks
    .map((id) => {
      const s = getSpec(id)
      return `<button type="button" class="chip" data-preview="${id}" style="--class:${s.color}">${specArtImg(s, specSkin(id))}${s.className}·${s.specName}</button>`
    })
    .join('')

  const rail = specsByClass()
    .map((group) => {
      const on = draftViewedId && getSpec(draftViewedId).classId === group.classId ? 'is-on' : ''
      const thumb = specArtImg(group.specs[0], specSkin(group.specs[0].id))
      return `<button type="button" class="class-link ${on}" data-jump-class="${group.classId}" style="--class:${group.color}">${thumb}<span>${group.className}</span></button>`
    })
    .join('')

  return `
    <div class="screen draft-screen">
      <div class="draft-bg" aria-hidden="true"></div>
      <header class="draft-head">
        <div class="draft-brand">
          <div class="kicker">组建小队</div>
          <nav class="draft-tabs" aria-label="征召分页">
            <span class="draft-tab is-on">专精选择</span>
            <button type="button" class="draft-tab" data-act="picked">队伍预览</button>
            <span class="draft-tab is-off" title="即将开放">天赋配置</span>
            <span class="draft-tab is-off" title="即将开放">挑战记录</span>
          </nav>
        </div>
        <div class="draft-head-copy">
          <h2>选择 5 个专精 <small>${draftPicks.length}/5</small></h2>
          <p class="hint">点击卡牌加入阵容。有「皮」按钮的专精，点该按钮可切换皮肤。</p>
        </div>
        <div class="top-actions">
          <button type="button" class="btn ghost" data-act="random">随机阵容</button>
          <button type="button" class="btn ghost" data-act="clear" ${draftPicks.length ? '' : 'disabled'}>清空</button>
          <button type="button" class="btn gold" data-act="confirm" ${draftPicks.length === 5 ? '' : 'disabled'}>出战</button>
        </div>
      </header>
      <div class="draft-body">
        <nav class="draft-rail" aria-label="职业列表">${rail}</nav>
        <div class="draft-main">
          <div class="picked-bar" id="picked-bar">${picked || '<span class="hint">从左侧点职业，或直接点中间卡牌加入阵容。</span>'}</div>
          <div class="draft-scroller">${groups}</div>
        </div>
        <aside class="draft-dock">${draftInspectHtml()}</aside>
      </div>
    </div>
  `
}

function draftInspectHtml(): string {
  const spec = draftViewedId ? getSpec(draftViewedId) : null
  if (!spec) {
    return `
      <div class="dock-box dock-skills">
        <div class="inspect-head">专精详情</div>
        <p class="inspect-hint">把鼠标移到卡牌上，或点击一张专精，即可查看属性与四个技能。</p>
      </div>
    `
  }
  const picked = draftPicks.includes(spec.id)
  const book = spec.skills
    .map((skill) => {
      const passive = Boolean(skill.passive || skill.effect.kind === 'stagger')
      return `
        <div class="inspect-skill ${passive ? 'is-passive' : ''}" style="--class:${spec.color}">
          <img src="${wowIcon(skill.icon)}" alt="" />
          <div class="inspect-skill-copy">
            <div class="inspect-skill-name">${escapeHtml(skill.name)}</div>
            <div class="inspect-skill-cost">${skillCostLabel(null, skill)}</div>
            <p>${escapeHtml(skill.desc)}</p>
          </div>
        </div>
      `
    })
    .join('')
  const extra = specExtraSkin(spec.id)
  const tip =
    spec.id === 'hunter-bm'
      ? '先召唤动物伙伴。杀戮命令令所有宠物扑向同一目标；狂野怒火强化猎人与宠物后再让每只宠物扫场。'
      : spec.id === 'evoker-aug'
        ? '先上黑檀之力再喷发延长持续时间。先知先觉在增辉存活时提高全队暴击。深呼吸给敌方挂上下一次易伤。'
        : extra
        ? `点卡牌上的「皮」可在原画和${extra.name}之间切换。`
        : '不同专精有独特的技能组合，合理搭配坦克、治疗与输出。'
  return `
    <div class="dock-box dock-skills">
      <div class="spec-hero">
        <div class="spec-portrait">${specArtImg(spec, specSkin(spec.id), true)}</div>
        <div>
          <div class="inspect-head">${spec.className} · ${spec.specName}</div>
          <div class="spec-role">${roleIconSvg(spec.role)}${ROLE_LABEL[spec.role]}${picked ? ' · 已入队' : ''}</div>
        </div>
      </div>
      <div class="spec-stats">
        <div><span>生命</span><b>${spec.maxHp}</b></div>
        <div><span>速度</span><b>${spec.speed}</b></div>
        <div><span>攻击力</span><b>${spec.atk}</b></div>
        <div><span>暴击率</span><b>${spec.crit}%</b></div>
        <div><span>暴击伤害</span><b>${spec.critDmg}%</b></div>
      </div>
      <div class="inspect-skills">${book}</div>
      <p class="inspect-tip">小贴士：${tip}</p>
    </div>
  `
}

function battleHtml(): string {
  if (!battle) return ''
  const aiHeroes = battle.units.filter((u) => u.side === 'ai' && !u.isPet).map((u) => renderBattleCard(u, cardOpts(u))).join('')
  const aiPets = battle.units.filter((u) => u.side === 'ai' && u.isPet).map((u) => renderBattleCard(u, cardOpts(u))).join('')
  const playerHeroes = battle.units.filter((u) => u.side === 'player' && !u.isPet).map((u) => renderBattleCard(u, cardOpts(u))).join('')
  const playerPets = battle.units.filter((u) => u.side === 'player' && u.isPet).map((u) => renderBattleCard(u, cardOpts(u))).join('')
  const mods = [
    fastMode ? 'is-fast' : '',
    paused ? 'is-paused' : '',
    dockHidden ? 'is-dock-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return `
    <div class="screen battle-screen ${mods}">
      <div class="yard" aria-hidden="true"></div>
      ${queueHtml()}
      ${turnMarkHtml()}
      ${utilHtml()}
      <div class="battle-center">
        <div class="lane enemy-lane">
          <div class="lane-cards">${aiHeroes}</div>
          ${aiPets ? `<div class="pet-row">${aiPets}</div>` : ''}
        </div>
        ${skillCueHtml()}
        <div class="lane player-lane">
          ${playerPets ? `<div class="pet-row">${playerPets}</div>` : ''}
          <div class="lane-cards">${playerHeroes}</div>
        </div>
        ${niuzaoWardHtml()}
      </div>
      <div class="hud">
        ${actorPanelHtml()}
      </div>
      ${teamSpHtml('player')}
      <div class="skill-corner">
        ${skillRadialHtml()}
      </div>
      <aside class="battle-dock">
        ${dockHtml()}
      </aside>
    </div>
  `
}

function turnMarkHtml(): string {
  if (!battle) return ''
  const yours = battle.turn === 'player' && !busy && !battle.winner
  return `
    <div class="turn-mark">
      <div class="turn-round">${roundLabel(battle.round)}</div>
      <div class="turn-who">${yours ? '轮到你了' : battle.winner ? '战斗结束' : busy ? '技能结算' : '敌方行动'}</div>
    </div>
  `
}

function roundLabel(n: number): string {
  const nums = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (n >= 1 && n <= 10) return `第${nums[n]}轮`
  return `第${n}轮`
}

function utilHtml(): string {
  return `
    <div class="util-btns">
      <button type="button" class="util-btn ${autoPlay ? 'is-on' : ''}" data-act="auto" title="自动">自动</button>
      <button type="button" class="util-btn ${fastMode ? 'is-on' : ''}" data-act="fast" title="两倍速">x2</button>
      <button type="button" class="util-btn ${paused ? 'is-on' : ''}" data-act="pause" title="暂停">${paused ? '继续' : '暂停'}</button>
      <button type="button" class="util-btn ${dockHidden ? '' : 'is-on'}" data-act="settings" title="规则面板">规则</button>
    </div>
  `
}

function queueHtml(): string {
  if (!battle) return ''
  const actor = uiActor()
  const items = queuedUnits(battle)
    .map((unit) => {
      const spec = getSpec(unit.specId)
      const current = actor?.uid === unit.uid
      const cls = [
        'queue-row',
        unit.side,
        current ? 'is-current' : '',
        unit.acted ? 'is-acted' : '',
        lastCue?.actorUid === unit.uid ? 'is-casting' : '',
      ]
        .filter(Boolean)
        .join(' ')
      return `
        <div class="${cls}" style="--class:${spec.color}" title="${spec.className}·${spec.specName} 速度 ${unit.speed}">
          ${current ? '<i class="queue-arrow"></i>' : ''}
          <div class="queue-item">${specArtImg(spec, unit.skinId)}</div>
          <span class="queue-spd">${unit.speed}</span>
        </div>
      `
    })
    .join('')
  return `
    <div class="atk-queue">
      <div class="queue-track">${items}</div>
    </div>
  `
}

function niuzaoWardHtml(): string {
  if (!battle) return ''
  return (['player', 'ai'] as Side[])
    .map((side) => {
      const ox = battle!.units.find((u) => u.side === side && u.hp > 0 && u.guardTurns > 0)
      if (!ox) return ''
      return `<div class="niuzao-ward ${side}" title="玄牛守护 ${ox.guardTurns} 回合">${oxMarkSvg()}</div>`
    })
    .join('')
}

function oxMarkSvg(): string {
  return `<svg viewBox="0 0 64 48" aria-hidden="true"><ellipse cx="32" cy="30" rx="22" ry="12" fill="#1c1812" opacity=".9"/><ellipse cx="32" cy="18" rx="13" ry="11" fill="#2a2418"/><path d="M22 16 L10 4 L24 14" fill="none" stroke="#1a1610" stroke-width="4"/><path d="M42 16 L54 4 L40 14" fill="none" stroke="#1a1610" stroke-width="4"/><path d="M22 16 L10 4" fill="none" stroke="#5ee0a0" stroke-width="1.6"/><path d="M42 16 L54 4" fill="none" stroke="#5ee0a0" stroke-width="1.6"/><circle cx="32" cy="17" r="3" fill="none" stroke="#efd27a" stroke-width="1.4"/><circle cx="20" cy="40" r="4" fill="#5ee0a0" opacity=".4"/><circle cx="44" cy="40" r="4" fill="#5ee0a0" opacity=".4"/></svg>`
}

function teamSpHtml(side: Side): string {
  if (!battle) return ''
  const sp = teamSp(battle, side)
  const meter = teamSpMeter(battle, side)
  const grant = nextSpGrant(battle, side)
  const brew = battle.units.some((u) => u.side === side && u.specId === 'monk-brew' && u.hp > 0)
  const rings = Array.from({ length: sp }, () => `<span class="sp-ring"></span>`).join('')
  const segs = Array.from({ length: SP_METER_MAX }, (_, i) => {
    const on = i < meter
    const head = on && i === meter - 1
    return `<i class="sp-seg ${on ? 'is-on' : ''} ${head ? 'is-head' : ''}"></i>`
  }).join('')
  const label = side === 'ai' ? '敌方技能点' : '技能点'
  const ready = meter >= SP_METER_MAX
  return `
    <div class="sp-meter team-sp ${side} ${brew ? 'is-brew' : ''} ${ready ? 'is-ready' : ''}" title="${label} ${sp}/${battle.maxSp} · 充能 ${meter}/${SP_METER_MAX} · 下一次满格 +${grant}">
      <div class="sp-row sp-meter-rings">${rings}</div>
      <div class="sp-meter-frame">
        <svg class="sp-meter-chrome" viewBox="0 0 520 64" preserveAspectRatio="none" aria-hidden="true">
          <path d="M18 8 L248 8 L260 2 L272 8 L502 8 L516 32 L502 56 L272 56 L260 62 L248 56 L18 56 L4 32 Z" fill="#12100c" stroke="#c4a056" stroke-width="2"/>
          <path d="M22 12 L248 12 L260 7 L272 12 L498 12 L510 32 L498 52 L272 52 L260 57 L248 52 L22 52 L10 32 Z" fill="none" stroke="#2a2418" stroke-width="1.2"/>
          <path d="M18 8 L4 32 L18 56" fill="none" stroke="#8a7340" stroke-width="1.4"/>
          <path d="M502 8 L516 32 L502 56" fill="none" stroke="#8a7340" stroke-width="1.4"/>
          <path d="M248 8 L260 2 L272 8" fill="none" stroke="#c4a056" stroke-width="1.2"/>
          <path d="M248 56 L260 62 L272 56" fill="none" stroke="#c4a056" stroke-width="1.2"/>
        </svg>
        <span class="sp-meter-cur">${sp}/${battle.maxSp}</span>
        <div class="sp-meter-track">${segs}</div>
        <span class="sp-meter-gain">+${grant}</span>
      </div>
    </div>
  `
}

function actorPanelHtml(): string {
  if (!battle) return ''
  const actor = viewedUnit()
  if (!actor) {
    return `<div class="actor-panel is-empty"><p>等待出手…</p></div>`
  }
  const spec = getSpec(actor.specId)
  const hpPct = Math.max(0, (actor.hp / actor.maxHp) * 100)
  const staggerLeft = actor.stagger.reduce((n, v) => n + v, 0)
  const havocTarget = actor.havocUid ? battle.units.find((u) => u.uid === actor.havocUid) : null
  const statuses = [
    actor.stunned ? statusChip(wowIcon('spell_frost_stun'), '眩晕') : '',
    actor.shield > 0 ? statusChip(wowIcon('inv_shield_04'), `护盾 ${actor.shield}`) : '',
    actor.dmgAmp > 0 ? statusChip(wowIcon('ability_monk_tigereyebrandy'), `增伤 ${actor.dmgAmp}%`) : '',
    actor.guardTurns > 0 ? statusChip(wowIcon('monk_stance_drunkenox'), `玄牛 ${actor.guardTurns}`) : '',
    staggerLeft > 0 ? statusChip(wowIcon('monk_ability_fistoffury'), `醉拳 ${staggerLeft}`) : '',
    actor.pistolLoaded ? statusChip(wowIcon('ability_rogue_pistolshot'), '下次手枪射击免费并额外回合') : '',
    actor.executeFree ? statusChip(wowIcon('inv_sword_48'), '下一次斩杀不耗技能点') : '',
    actor.specId === 'warrior-arms' ? statusChip(wowIcon('ability_rogue_slicedice'), '横扫攻击') : '',
    actor.ardentPct > 0
      ? statusChip(wowIcon('spell_holy_ardentdefender'), `炽热防御者 +${actor.ardentPct}% 攻击与生命`)
      : '',
    actor.hots.length > 0
      ? statusChip(
          wowIcon('spell_nature_rejuvenation'),
          `回春术 剩余 ${actor.hots.reduce((n, h) => n + h.turns, 0)} 回合`,
        )
      : '',
    actor.freeSkill ? statusChip(wowIcon('spell_nature_lightning'), '下一个技能不耗技能点') : '',
    actor.boneShield > 0
      ? statusChip(wowIcon('ability_deathknight_boneshield'), `骨盾 ${actor.boneShield} 层`)
      : '',
    actor.takenReducePct > 0
      ? statusChip(
          wowIcon('spell_deathknight_antimagiczone'),
          `减伤 ${actor.takenReducePct}% · ${actor.takenReduceTurns} 回合`,
        )
      : '',
    actor.runeWeaponTurns > 0
      ? statusChip(wowIcon('inv_sword_07'), `符文刃舞 ${actor.runeWeaponTurns} 回合`)
      : '',
    actor.clearcast > 0
      ? statusChip(wowIcon('spell_shadow_manaburn'), `节能施法 ${actor.clearcast} 层`)
      : '',
    actor.metaTurns > 0
      ? statusChip(wowIcon('ability_demonhunter_metamorphasisdps'), `恶魔变形 ${actor.metaTurns} 回合`)
      : '',
    actor.ebonTurns > 0
      ? statusChip(wowIcon('ability_evoker_ebonmight'), `黑檀之力 攻击 +${actor.ebonAtkPct}% · ${actor.ebonTurns} 回合`)
      : '',
    prescienceBonus(battle, actor) > 0
      ? statusChip(wowIcon('ability_evoker_prescience'), `先知先觉 暴击 +${prescienceBonus(battle, actor)}%`)
      : '',
    actor.nextTakenAmp > 0
      ? statusChip(wowIcon('ability_evoker_deepbreath'), `下次受伤 +${actor.nextTakenAmp}%`)
      : '',
    actor.magiTurns > 0
      ? statusChip(
          wowIcon('inv_ability_mage_radiantspark'),
          `大法师之触 累计 ${actor.magiStored} · ${actor.magiTurns} 回合`,
        )
      : '',
    actor.takenAmp > 0 ? statusChip(wowIcon('ability_warrior_colossussmash'), `易伤 ${actor.takenAmp}% · ${actor.takenAmpTurns} 回合`) : '',
    actor.healTakenPct < 100 ? statusChip(wowIcon('ability_warrior_savageblow'), `治疗效果降低 ${100 - actor.healTakenPct}%`) : '',
    actor.priorityAct ? statusChip(wowIcon('spell_holy_powerinfusion'), '立即回合') : '',
    actor.eleOverloadTurns > 0
      ? statusChip(wowIcon('8026697'), `升腾过载 ${actor.eleOverloadTurns} 回合`)
      : '',
    actor.chaosStacks > 0
      ? statusChip(wowIcon('ability_warlock_chaosbolt'), `混乱之箭 +${actor.chaosStacks * 20}%`)
      : '',
    havocTarget ? statusChip(wowIcon('ability_warlock_baneofhavoc'), `浩劫目标：${getSpec(havocTarget.specId).className}·${getSpec(havocTarget.specId).specName}`) : '',
    actor.specId === 'hunter-bm'
      ? statusChip(wowIcon('ability_hunter_beastcall'), `动物伙伴 ${petsOf(battle.units, actor.uid).length}/3`)
      : '',
    actor.isPet ? statusChip(wowIcon(getSpec(actor.specId).icon), '召唤物') : '',
  ]
    .filter(Boolean)
    .join('')
  const flavor = CLASS_LINE[spec.classId] ?? `${spec.className}·${spec.specName}`
  return `
    <div class="actor-panel" style="--class:${spec.color}">
      <div class="actor-art">${specArtImg(spec, actor.skinId, true)}</div>
      <div class="actor-copy">
        <div class="actor-head">
          <div class="actor-name">${spec.className} · ${spec.specName}</div>
          ${roleIconSvg(spec.role)}
          <span class="actor-role">${ROLE_LABEL[spec.role]}</span>
        </div>
        <div class="hp-row">
            <div class="hp-stack">
              <div class="hp-bar ${matchHasArms(battle) && hpPct < 35 ? 'is-low-exec' : ''}"><i style="width:${hpPct}%"></i>${matchHasArms(battle) ? '<span class="exec-line" title="斩杀线 35%"></span>' : ''}</div>
            ${
              actor.hasStagger
                ? `<div class="stagger-bar" title="醉拳待偿还 ${staggerLeft}"><i style="width:${Math.min(100, (staggerLeft / actor.maxHp) * 100)}%"></i></div>`
                : ''
            }
          </div>
          <span class="hp-text">${actor.hp}/${actor.maxHp}</span>
          <span class="actor-spd">速度 ${actor.speed}</span>
          <span class="actor-spd">攻击 ${effectiveAtk(actor)}</span>
          <span class="actor-spd">暴击 ${effectiveCrit(battle, actor)}%</span>
          <span class="actor-spd">爆伤 ${actor.critDmg}%</span>
        </div>
        <div class="actor-status"><span>状态</span>${statuses || '<em>无</em>'}</div>
        <p class="actor-flavor">${escapeHtml(flavor)}</p>
      </div>
    </div>
  `
}

function statusChip(icon: string, title: string): string {
  return `<img class="status-ico" src="${icon}" alt="" title="${escapeHtml(title)}" />`
}

function skillRadialHtml(): string {
  if (!battle) return ''
  const actor = uiActor()
  if (!actor) {
    return `<div class="skill-corner-inner"><div class="skill-radial is-wait"><p>等待出手…</p></div></div>`
  }
  const spec = getSpec(actor.specId)
  const canCast =
    !battle.winner &&
    !busy &&
    !paused &&
    battle.turn === 'player' &&
    actor.side === 'player'
  const highlight = viewedSkill
  const buttons = spec.skills
    .map((skill) => {
      const shown = presentSkill(skill, actor)
      const passive = Boolean(skill.passive || skill.effect.kind === 'stagger')
      const ok = canCast && !passive && canUseSkill(battle!, actor, skill)
      const active = highlight === skill.id
      const ult = skill.id === 's3'
      const tag = skill.id === 'aa' && shown.name === skill.name ? '普攻' : shown.name
      const paid = skillCost(actor, skill)
      const cost =
        passive || skill.effect.kind === 'stagger'
          ? '被'
          : skill.effect.kind === 'gain-sp'
            ? `+${skill.effect.value}`
            : String(paid)
      const locked = canCast && !passive && !ok
      const free = paid === 0 && skill.cost > 0
      const overload = actor.eleOverloadTurns > 0 && (skill.id === 'aa' || skill.id === 's2') && actor.specId === 'shaman-ele'
      const chaos =
        actor.specId === 'warlock-destro' && skill.id === 's1' && actor.chaosStacks > 0
          ? `is-chaos chaos-${actor.chaosStacks}`
          : ''
      const havocMark = actor.specId === 'warlock-destro' && skill.id === 's2' && actor.havocUid ? 'is-havoc-mark' : ''
      const felForm =
        actor.specId === 'dh-havoc' && actor.metaTurns > 0 && (skill.id === 'aa' || skill.id === 's1')
          ? 'is-fel'
          : ''
      const ebonOn = actor.specId === 'evoker-aug' && actor.ebonTurns > 0 && skill.id === 's2' ? 'is-ebon' : ''
      const execReady = skill.id === 's3' && executeReady(battle!, actor)
      const chaosTip =
        actor.specId === 'warlock-destro' && skill.id === 's1' && actor.chaosStacks > 0
          ? `烧尽增幅 ×${actor.chaosStacks}，伤害 +${actor.chaosStacks * 20}%`
          : ''
      const pack = actor.specId === 'hunter-bm' || actor.isPet ? petsOf(battle!.units, actor.isPet ? actor.ownerUid ?? '' : actor.uid).length : 0
      const title = overload
        ? '升腾过载：该技能必定触发根深蒂固'
        : execReady
          ? '斩杀：有敌人生命低于 35%'
          : skill.effect.kind === 'kill-command' && pack <= 0
            ? '场上没有宠物'
            : skill.effect.kind === 'summon-pet' && pack >= skill.effect.value
              ? '宠物已满，最多 3 只'
              : skill.effect.kind === 'bestial-wrath' && pack <= 0
                ? '场上没有宠物'
                : skill.effect.kind === 'metamorphosis' && actor.metaTurns > 0
                  ? `恶魔变形剩余 ${actor.metaTurns} 回合`
                  : chaosTip
      return `
        <button type="button" class="skill-orb ${ult ? 'is-ult' : ''} ${active ? 'is-on' : ''} ${passive ? 'is-passive' : ''} ${locked ? 'is-locked' : ''} ${free ? 'is-free' : ''} ${overload ? 'is-overload' : ''} ${chaos} ${havocMark} ${felForm} ${ebonOn} ${execReady ? 'is-execute-ready' : ''}" data-skill="${skill.id}" title="${title}" style="--class:${spec.color}">
          <img src="${wowIcon(shown.icon)}" alt="" />
          <span class="orb-name">${escapeHtml(ult ? shown.name : tag)}</span>
          <span class="orb-cost">${cost}</span>
        </button>
      `
    })
    .join('')
  return `
    <div class="skill-corner-inner" style="--class:${spec.color}">
      <div class="skill-radial ${canCast ? '' : 'is-preview'}">${buttons}</div>
    </div>
  `
}

function dockHtml(): string {
  return `
    ${rulesHtml()}
    ${logHtml()}
    ${skillBookHtml()}
  `
}

function rulesHtml(): string {
  return `
    <div class="dock-box dock-rules">
      <div class="inspect-head">规则提示</div>
      <p class="inspect-hint">技能点全队共用，最多 8 点，开场 3 点。友方每行动一次为中间充能条填 1 格；5 格满后再行动获得技能点（首次 +3，第二次 +4，之后固定 +5）。普攻仍回复技能点。点击卡牌可查看该角色技能详情。</p>
    </div>
  `
}

function skillBookHtml(): string {
  const viewed = viewedUnit()
  if (!viewed) {
    return `
      <div class="dock-box dock-skills is-empty">
        <div class="inspect-head">技能详情</div>
        <p class="inspect-hint">等待出手…</p>
      </div>
    `
  }
  const spec = getSpec(viewed.specId)
  const who = viewed.side === 'ai' ? '敌方' : '我方'
  const highlight = viewedSkill
  const book = spec.skills
    .map((skill) => {
      const shown = presentSkill(skill, viewed)
      const passive = Boolean(skill.passive || skill.effect.kind === 'stagger')
      const on = highlight === skill.id
      const execReady = Boolean(battle && skill.id === 's3' && executeReady(battle, viewed))
      return `
        <button type="button" class="inspect-skill ${passive ? 'is-passive' : ''} ${on ? 'is-on' : ''} ${execReady ? 'is-execute-ready' : ''}" data-view-skill="${skill.id}" style="--class:${spec.color}">
          <img src="${wowIcon(shown.icon)}" alt="" />
          <div class="inspect-skill-copy">
            <div class="inspect-skill-name">${escapeHtml(shown.name)}</div>
            <div class="inspect-skill-cost">${skillCostLabel(viewed, skill)}</div>
            <p>${escapeHtml(shown.desc)}</p>
          </div>
        </button>
      `
    })
    .join('')
  return `
    <div class="dock-box dock-skills">
      <div class="inspect-head">${who} · ${spec.className} · ${spec.specName}</div>
      <div class="inspect-skills">${book}</div>
    </div>
  `
}

function logHtml(): string {
  const lines = battle ? battle.log.map((l) => `<div>${escapeHtml(l)}</div>`).join('') : ''
  return `
    <div class="dock-box dock-log">
      <div class="battle-log-title">对战记录</div>
      <div class="battle-log-body">${lines}</div>
    </div>
  `
}

function skillCostLabel(unit: Unit | null, skill: SkillDef): string {
  if (skill.passive || skill.effect.kind === 'stagger') return '被动'
  if (skill.effect.kind === 'gain-sp') return `+${skill.effect.value} 点`
  if (skill.gainSp) return `回 ${skill.gainSp} 点`
  const cost = unit ? skillCost(unit, skill) : skill.cost
  if (cost === 0 && skill.cost > 0) {
    if (skill.effect.kind === 'execute') return '免费'
    if (unit?.freeSkill) return '免费'
    return '免费 · 额外回合'
  }
  if (cost === 0) return '不消耗'
  return `耗 ${cost} 点`
}

function restoreLogScroll(): void {
  const logEl = app().querySelector<HTMLElement>('.battle-log-body')
  if (!logEl) return
  logEl.scrollTop = logStickToEnd ? logEl.scrollHeight : logScrollTop
  logEl.addEventListener('scroll', () => {
    logStickToEnd = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 28
    logScrollTop = logEl.scrollTop
  })
}

function resultHtml(): string {
  const win = battle?.winner === 'player'
  return `
    <div class="screen result-screen">
      <div class="kicker">${win ? 'FOR THE ALLIANCE / HORDE' : 'WIPE'}</div>
      <h1>${win ? '胜利' : '战败'}</h1>
      <p>${win ? '敌方小队已被击溃。' : '你的小队全军覆没。'}</p>
      <div class="top-actions">
        <button type="button" class="btn gold" data-go="draft">再征召一队</button>
        <button type="button" class="btn ghost" data-go="title">返回标题</button>
      </div>
    </div>
  `
}

function skillCueHtml(): string {
  if (!lastCue) return ''
  const spec = getSpec(lastCue.specId)
  const who = lastCue.side === 'ai' ? '敌方' : '我方'
  return `
    <div class="skill-cue-slot">
      <div class="skill-cue ${lastCue.side}" style="--class:${lastCue.color}">
        <img src="${wowIcon(lastCue.skillIcon)}" alt="" />
        <div class="skill-cue-copy">
          <div class="skill-cue-who">${who} · ${spec.className}·${spec.specName}</div>
          <div class="skill-cue-name">${escapeHtml(lastCue.skillName)}</div>
        </div>
        <i class="skill-cue-bar"></i>
      </div>
    </div>
  `
}

function cardOpts(unit: Unit): {
  selected?: boolean
  inspected?: boolean
  targetable?: boolean
  dimmed?: boolean
  acting?: boolean
  actor?: boolean
  cueIcon?: string
  havoced?: boolean
  showExecute?: boolean
  prescience?: number
} {
  const viewed = viewedUnit()
  const shown = uiActor()
  const caster = selectedUnit()
  const skill = selectedSkillDef()
  const targets = caster && skill && !lastCue ? validTargets(battle!, caster, skill).map((t) => t.uid) : []
  const targetable = Boolean(skill && targets.includes(unit.uid))
  const current = shown?.uid === unit.uid
  const dimmed = Boolean(lastCue)
    ? unit.uid !== lastCue!.actorUid && unit.hp > 0
    : !current && (unit.acted || unit.stunned || unit.hp <= 0)
  const acting = lastCue?.actorUid === unit.uid
  return {
    selected: unit.uid === selectedUid,
    inspected: Boolean(viewed && unit.uid === viewed.uid && !current),
    targetable,
    dimmed,
    acting,
    actor: current,
    cueIcon: acting ? wowIcon(lastCue!.skillIcon) : undefined,
    havoced: Boolean(battle?.units.some((u) => u.hp > 0 && u.havocUid === unit.uid)),
    showExecute: Boolean(battle && matchHasArms(battle)),
    prescience: battle ? prescienceBonus(battle, unit) : 0,
  }
}

function uiActor(): Unit | null {
  if (!battle) return null
  if (lastCue) {
    return battle.units.find((u) => u.uid === lastCue!.actorUid) ?? currentActor(battle)
  }
  return currentActor(battle)
}

function viewedUnit(): Unit | null {
  if (!battle) return null
  if (viewPinned && inspectedUid) {
    const unit = battle.units.find((u) => u.uid === inspectedUid)
    if (unit) return unit
  }
  if (lastCue) {
    return battle.units.find((u) => u.uid === lastCue!.actorUid) ?? currentActor(battle)
  }
  const actor = currentActor(battle)
  if (actor?.side === 'player') return actor
  if (inspectedUid) {
    const unit = battle.units.find((u) => u.uid === inspectedUid)
    if (unit) return unit
  }
  return actor
}

function selectedUnit(): Unit | null {
  if (!battle) return null
  const current = currentActor(battle)
  if (current?.side === 'player') return current
  if (!selectedUid) return null
  return battle.units.find((u) => u.uid === selectedUid) ?? null
}

function selectedSkillDef(): SkillDef | null {
  const unit = selectedUnit()
  if (!unit || !selectedSkill) return null
  return getSpec(unit.specId).skills.find((s) => s.id === selectedSkill) ?? null
}

function syncActorSelection(): void {
  if (!battle) {
    selectedUid = null
    selectedSkill = null
    inspectedUid = null
    viewedSkill = null
    viewPinned = false
    return
  }
  const actor = currentActor(battle)
  selectedUid = actor?.side === 'player' ? actor.uid : null
  selectedSkill = null
  viewedSkill = null
  if (actor?.side === 'player') {
    viewPinned = false
    inspectedUid = actor.uid
  }
}

function bind(): void {
  const root = app()
  root.querySelectorAll<HTMLElement>('[data-go]').forEach((el) => {
    el.addEventListener('click', () => go(el.dataset.go as Screen))
  })

  root.querySelectorAll<HTMLElement>('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.dataset.act
      if (act === 'random') randomDraft()
      if (act === 'clear') {
        draftPicks = []
        draftViewedId = null
        render()
      }
      if (act === 'confirm') confirmDraft()
      if (act === 'picked') {
        app().querySelector('#picked-bar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      if (act === 'auto') toggleAuto()
      if (act === 'fast') {
        fastMode = !fastMode
        render()
      }
      if (act === 'pause') togglePaused()
      if (act === 'settings') {
        dockHidden = !dockHidden
        render()
      }
    })
  })

  root.querySelectorAll<HTMLElement>('[data-spec]').forEach((el) => {
    const specId = el.dataset.spec!
    el.querySelector<HTMLElement>('[data-skin-toggle]')?.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      cycleDraftSkin(specId)
    })
    el.addEventListener('click', () => toggleDraft(specId))
    el.addEventListener('mouseenter', () => previewDraft(specId))
  })
  root.querySelectorAll<HTMLElement>('[data-jump-class]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.jumpClass
      if (!id) return
      app().querySelector(`#class-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
  root.querySelectorAll<HTMLElement>('[data-preview]').forEach((el) => {
    el.addEventListener('mouseenter', () => previewDraft(el.dataset.preview!))
  })

  root.querySelectorAll<HTMLElement>('[data-uid]').forEach((el) => {
    el.addEventListener('click', () => onCardClick(el.dataset.uid!))
  })

  root.querySelectorAll<HTMLElement>('[data-skill]').forEach((el) => {
    el.addEventListener('click', () => onSkillClick(el.dataset.skill as SkillId))
  })
  root.querySelectorAll<HTMLElement>('[data-view-skill]').forEach((el) => {
    el.addEventListener('click', () => onViewSkillClick(el.dataset.viewSkill as SkillId))
  })
}

function toggleAuto(): void {
  autoPlay = !autoPlay
  render()
  if (autoPlay) queueAuto()
}

function togglePaused(): void {
  paused = !paused
  setFxPaused(paused)
  if (!paused && pendingResume) {
    pendingResume = false
    finishResume()
    return
  }
  render()
}

function go(next: Screen): void {
  screen = next
  location.hash = next === 'admin' ? 'admin' : ''
  clearPause()
  lastCue = null
  busy = false
  pendingResume = false
  void stopBattleFx()
  if (next === 'title') {
    battle = null
    draftPicks = []
    inspectedUid = null
    viewedSkill = null
    viewPinned = false
    draftViewedId = null
  }
  if (next === 'draft') {
    battle = null
    selectedUid = null
    selectedSkill = null
    inspectedUid = null
    viewedSkill = null
    viewPinned = false
    if (!draftViewedId) draftViewedId = draftPicks[0] ?? null
  }
  render()
}

function previewDraft(id: string): void {
  if (screen !== 'draft' || draftViewedId === id) return
  draftViewedId = id
  const dock = app().querySelector('.draft-dock')
  if (dock) dock.innerHTML = draftInspectHtml()
  app()
    .querySelectorAll('.draft-card.is-inspect')
    .forEach((el) => el.classList.remove('is-inspect'))
  app().querySelector(`.draft-card[data-spec="${CSS.escape(id)}"]`)?.classList.add('is-inspect')
  kickSkinVideos()
}

function cycleDraftSkin(specId: string): void {
  const extra = specExtraSkin(specId)
  if (!extra) return
  if (specSkin(specId) === extra.id) delete draftSkins[specId]
  else draftSkins[specId] = extra.id
  saveDraftSkins()
  draftViewedId = specId
  render()
}

function toggleDraft(id: string): void {
  draftViewedId = id
  if (draftPicks.includes(id)) draftPicks = draftPicks.filter((x) => x !== id)
  else if (draftPicks.length < 5) draftPicks = [...draftPicks, id]
  render()
}

function randomDraft(): void {
  const tanks = SPECS.filter((s) => s.role === 'tank')
  const healers = SPECS.filter((s) => s.role === 'healer')
  const dps = SPECS.filter((s) => s.role === 'dps')
  const pick = (list: typeof SPECS) => list[Math.floor(Math.random() * list.length)].id
  const set = new Set<string>([pick(tanks), pick(healers)])
  while (set.size < 5) set.add(pick(dps))
  draftPicks = [...set]
  draftViewedId = draftPicks[0] ?? null
  render()
}

function confirmDraft(): void {
  if (draftPicks.length !== 5) return
  clearPause()
  lastCue = null
  busy = false
  pendingResume = false
  battle = createBattle(draftPicks, aiPickDraft(), draftSkins)
  syncActorSelection()
  logStickToEnd = true
  screen = 'battle'
  render()
  if (battle.turn === 'ai') queueAi()
  else if (autoPlay) queueAuto()
}

function onCardClick(uid: string): void {
  if (!battle) return
  if (!battle.winner && !busy && !paused && battle.turn === 'player') {
    const actor = selectedUnit()
    const skill = selectedSkillDef()
    if (actor && skill && canUseSkill(battle, actor, skill)) {
      const targets = validTargets(battle, actor, skill)
      if (targets.some((t) => t.uid === uid)) {
        playPlayer(actor.uid, skill.id, uid)
        return
      }
    }
  }
  inspectedUid = uid
  viewedSkill = null
  viewPinned = true
  render()
}

function onViewSkillClick(skillId: SkillId): void {
  if (!battle) return
  viewedSkill = skillId
  const viewed = viewedUnit()
  const actor = currentActor(battle)
  if (viewed && actor && viewed.uid === actor.uid) {
    onSkillClick(skillId)
    return
  }
  render()
}

function onSkillClick(skillId: SkillId): void {
  if (!battle) return
  const actor = currentActor(battle)
  if (!actor) return
  const skill = getSpec(actor.specId).skills.find((s) => s.id === skillId)
  if (!skill) return
  viewedSkill = skillId
  const canCast =
    !battle.winner &&
    !busy &&
    !paused &&
    battle.turn === 'player' &&
    actor.side === 'player'
  if (!canCast) {
    render()
    return
  }
  selectedSkill = skillId
  const passive = Boolean(skill.passive || skill.effect.kind === 'stagger')
  if (passive || !canUseSkill(battle, actor, skill)) {
    render()
    return
  }
  if (skill.target === 'all-enemies' || skill.target === 'all-allies' || skill.target === 'self') {
    playPlayer(actor.uid, skillId, skill.target === 'self' ? actor.uid : null)
    return
  }
  const targets = validTargets(battle, actor, skill)
  if (targets.length === 1) {
    playPlayer(actor.uid, skillId, targets[0].uid)
    return
  }
  render()
}

function playPlayer(actorUid: string, skillId: SkillId, targetUid: string | null): void {
  if (!battle) return
  const actor = battle.units.find((u) => u.uid === actorUid)
  lastChaosStacks = actor?.chaosStacks ?? 0
  lastHavocUid = actor?.havocUid ?? null
  lastMetaForm = (actor?.metaTurns ?? 0) > 0
  lastEbonExtend = (actor?.ebonTurns ?? 0) > 0
  const result = applyAction(battle, actorUid, skillId, targetUid)
  pendingFloats = result.floats
  floats = []
  lastTargetUid = targetUid
  lastProcAscend = Boolean(result.procAscend)
  lastProcSweep = Boolean(result.procSweep)
  lastSweepUid = result.sweepUid ?? null
  lastExecuteLow = Boolean(result.executeLow)
  lastExecuteKill = Boolean(result.executeKill)
  lastPetUids = result.petUids ?? []
  lastSummonedUid = result.summonedUid ?? null
  lastExtraUids = result.extraUids ?? []
  if (actor) {
    playSkillSfx(actor.specId, skillId)
    if (result.procAscend) {
      window.setTimeout(() => playSkillSfx(actor.specId, 's1', { overlap: true }), 280)
    }
    if (result.procSweep) {
      window.setTimeout(() => playSkillSfx(actor.specId, 's2', { overlap: true }), 180)
    }
    lastCue = makeCue(actor, skillId)
  }
  selectedSkill = null
  afterPlay()
}

function makeCue(actor: Unit, skillId: SkillId): SkillCue {
  const spec = getSpec(actor.specId)
  const skill = presentSkill(spec.skills.find((s) => s.id === skillId)!, actor)
  return {
    actorUid: actor.uid,
    specId: actor.specId,
    skillId,
    skillName: skill.name,
    skillIcon: skill.icon,
    color: spec.color,
    side: actor.side,
  }
}

function clearPause(): void {
  if (pauseTimer) window.clearTimeout(pauseTimer)
  pauseTimer = 0
  pauseGen += 1
}

function pauseMs(): number {
  return fastMode ? ACTION_PAUSE_FAST_MS : ACTION_PAUSE_MS
}

function afterPlay(): void {
  if (!battle || !lastCue) return
  busy = true
  render()
  const gen = pauseGen
  const cue = lastCue
  const targetUid = lastTargetUid ?? pendingFloats[0]?.uid ?? null
  const targetUids = [
    ...new Set(
      pendingFloats
        .filter((f) => f.kind === 'damage' || f.kind === 'kill' || f.kind === 'heal' || f.kind === 'buff')
        .map((f) => f.uid),
    ),
  ]
  void playBattleFx({
    specId: cue.specId,
    skillId: cue.skillId,
    actorUid: cue.actorUid,
    targetUid,
    targetUids,
    procAscend: lastProcAscend,
    procSweep: lastProcSweep,
    sweepUid: lastSweepUid,
    executeLow: lastExecuteLow,
    executeKill: lastExecuteKill,
    chaosStacks: lastChaosStacks,
    havocUid: lastHavocUid,
    petUids: lastPetUids,
    summonedUid: lastSummonedUid,
    extraUids: lastExtraUids,
    metaForm: lastMetaForm,
    ebonExtend: lastEbonExtend,
    side: cue.side,
    timeScale: fastMode ? 2 : 1,
    paused,
    onImpact: () => {
      const incoming = pendingFloats
      floats = incoming
      pendingFloats = []
      playFloats()
      const staggerHit = incoming.find((f) => f.kind === 'stagger')
      if (staggerHit) playStaggerHit(staggerHit.uid)
      const shared = incoming.find((f) => f.kind === 'share' && f.text === '分担')
      if (shared && lastTargetUid && lastTargetUid !== shared.uid) {
        playOxShare(lastTargetUid, shared.uid)
      }
    },
  }).catch(() => {
    if (!floats.length && pendingFloats.length) {
      floats = pendingFloats
      pendingFloats = []
      playFloats()
    }
  })
  pauseTimer = window.setTimeout(() => {
    if (gen !== pauseGen) return
    if (paused) {
      pendingResume = true
      return
    }
    finishResume()
  }, pauseMs())
}

function finishResume(): void {
  lastCue = null
  interruptBattleFx()
  if (!battle) return
  if (battle.winner) {
    busy = false
    void stopBattleFx()
    screen = 'result'
    render()
    return
  }
  busy = false
  syncActorSelection()
  render()
  if (battle.turn === 'ai') queueAi()
  else if (autoPlay) queueAuto()
}

function queueAi(): void {
  if (!battle || battle.winner || battle.turn !== 'ai' || busy || paused) return
  busy = true
  render()
  const action = aiPickAction(battle)
  if (!action) {
    skipCurrent(battle)
    lastCue = null
    busy = false
    syncActorSelection()
    render()
    if (battle.turn === 'ai' && !battle.winner) queueAi()
    return
  }
  const actor = battle.units.find((u) => u.uid === action.actorUid)
  lastChaosStacks = actor?.chaosStacks ?? 0
  lastHavocUid = actor?.havocUid ?? null
  lastMetaForm = (actor?.metaTurns ?? 0) > 0
  lastEbonExtend = (actor?.ebonTurns ?? 0) > 0
  const result = applyAction(battle, action.actorUid, action.skillId, action.targetUid)
  pendingFloats = result.floats
  floats = []
  lastTargetUid = action.targetUid
  lastProcAscend = Boolean(result.procAscend)
  lastProcSweep = Boolean(result.procSweep)
  lastSweepUid = result.sweepUid ?? null
  lastExecuteLow = Boolean(result.executeLow)
  lastExecuteKill = Boolean(result.executeKill)
  lastPetUids = result.petUids ?? []
  lastSummonedUid = result.summonedUid ?? null
  lastExtraUids = result.extraUids ?? []
  if (actor) {
    playSkillSfx(actor.specId, action.skillId)
    if (result.procAscend) {
      window.setTimeout(() => playSkillSfx(actor.specId, 's1', { overlap: true }), 280)
    }
    if (result.procSweep) {
      window.setTimeout(() => playSkillSfx(actor.specId, 's2', { overlap: true }), 180)
    }
    lastCue = makeCue(actor, action.skillId)
  }
  afterPlay()
}

function queueAuto(): void {
  if (!autoPlay || !battle || battle.winner || battle.turn !== 'player' || busy || paused) return
  const action = pickAction(battle)
  if (!action) return
  window.setTimeout(() => {
    if (!autoPlay || !battle || battle.winner || battle.turn !== 'player' || busy || paused) return
    playPlayer(action.actorUid, action.skillId, action.targetUid)
  }, 280)
}

let floatSwing = 0

function playFloats(): void {
  const shown = floats
  floats = []
  for (const item of shown) {
    const wait = item.delay ?? 0
    window.setTimeout(() => {
      const layer = app().querySelector<HTMLElement>(`[data-float="${item.uid}"]`)
      if (!layer) return
      const node = document.createElement('span')
      const dir = floatSwing++ % 2 === 0 ? 'is-up-left' : 'is-up-right'
      const crit = Boolean(item.crit && (item.kind === 'damage' || item.kind === 'kill'))
      node.className = `floater ${item.kind} ${dir}${crit ? ' is-crit' : ''}${item.tag ? ' has-tag' : ''}${item.text === '横扫' ? ' is-sweep' : ''}`
      if (crit) {
        node.innerHTML = `<b>${escapeHtml(item.text)}</b><em>暴击</em>${item.tag ? `<i>${escapeHtml(item.tag)}</i>` : ''}`
      } else if (item.tag) {
        node.innerHTML = `${escapeHtml(item.text)}<i>${escapeHtml(item.tag)}</i>`
      } else {
        node.textContent = item.text
      }
      layer.appendChild(node)
      window.setTimeout(() => node.remove(), crit ? 2200 : 1700)
    }, wait)
  }
}
