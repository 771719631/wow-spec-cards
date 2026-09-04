import { CLASSIC_SKIN, specExtraSkin, stillUrl, videoUrl } from '../data/art'
import type { Role, SpecDef } from '../engine/types'
import type { Unit } from '../engine/types'
import { getSpec } from '../data/specs'

export function specArtImg(spec: SpecDef, skinId?: string, live = false): string {
  const alt = escapeHtml(spec.specName)
  const still = stillUrl(spec, skinId)
  const video = live ? videoUrl(spec, skinId) : null
  if (video) {
    return `<video class="wow-icon" src="${video}" poster="${still}" muted loop playsinline preload="none"></video>`
  }
  return `<img class="wow-icon" src="${still}" alt="${alt}" draggable="false" loading="lazy" decoding="async" />`
}

export function roleIconSvg(role: Role): string {
  if (role === 'tank') {
    return `<svg class="role-ico tank" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v7c0 5.2 3.4 9.4 8 10.5C16.6 21.4 20 17.2 20 12V5l-8-3zm0 3.1 5.5 2V12c0 3.7-2.3 6.8-5.5 7.8C8.8 18.8 6.5 15.7 6.5 12V7.1L12 5.1z"/></svg>`
  }
  if (role === 'healer') {
    return `<svg class="role-ico healer" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z"/></svg>`
  }
  return `<svg class="role-ico dps" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 21 14.5 9.5l2 2L5 23H3v-2zm14.7-12.3 1.8-1.8 2.1 2.1-1.8 1.8-2.1-2.1zM13 4l2.2 2.2-1.4 1.4L11.6 5.4 13 4zM8.8 8.2l1.4-1.4L12.4 9l-1.4 1.4-2.2-2.2z"/></svg>`
}

export function renderDraftCard(
  spec: SpecDef,
  selected: boolean,
  inspected = false,
  skinId = CLASSIC_SKIN,
): string {
  const extra = specExtraSkin(spec.id)
  const custom = Boolean(extra && skinId === extra.id)
  return `
    <button type="button" class="card draft-card ${selected ? 'is-selected' : ''} ${inspected ? 'is-inspect' : ''} ${extra ? 'can-skin' : ''} ${custom ? 'has-skin' : ''}" data-spec="${spec.id}" style="--class:${spec.color}">
      ${extra ? `<span class="skin-btn" data-skin-toggle="${spec.id}" title="切换 ${extra.name}" role="button">皮</span>` : ''}
      <div class="card-art">${specArtImg(spec, skinId, false)}</div>
      <div class="card-caption">
        <div class="card-spec">${spec.specName}</div>
      </div>
    </button>
  `
}

export function renderBattleCard(
  unit: Unit,
  opts: {
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
  },
): string {
  const spec = getSpec(unit.specId)
  const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100)
  const dead = unit.hp <= 0
  const staggerLeft = unit.stagger.reduce((n, v) => n + v, 0)
  const flags = [
    unit.stunned && !dead ? '<span class="flag stun">眩</span>' : '',
    unit.shield > 0 && !dead ? `<span class="flag shield">盾${unit.shield}</span>` : '',
    unit.dmgAmp > 0 && !dead ? `<span class="flag buff">伤${unit.dmgAmp}%</span>` : '',
    unit.guardTurns > 0 && !dead ? `<span class="flag share">牛${unit.guardTurns}</span>` : '',
    staggerLeft > 0 && !dead ? `<span class="flag stagger">醉${staggerLeft}</span>` : '',
    unit.pistolLoaded && !dead ? '<span class="flag buff">枪</span>' : '',
    unit.executeFree && !dead ? '<span class="flag buff">斩</span>' : '',
    unit.ardentPct > 0 && !dead ? `<span class="flag buff">炽${unit.ardentPct}%</span>` : '',
    unit.hots.length > 0 && !dead
      ? `<span class="flag hot">春${unit.hots.reduce((n, h) => n + h.turns, 0)}</span>`
      : '',
    unit.freeSkill && !dead ? '<span class="flag buff">活</span>' : '',
    unit.isPet && !dead ? '<span class="flag buff">宠</span>' : '',
    unit.boneShield > 0 && !dead ? `<span class="flag bone">骨${unit.boneShield}</span>` : '',
    unit.takenReducePct > 0 && !dead ? `<span class="flag reduce">抗${unit.takenReducePct}%</span>` : '',
    unit.runeWeaponTurns > 0 && !dead ? `<span class="flag buff">刃${unit.runeWeaponTurns}</span>` : '',
    unit.clearcast > 0 && !dead ? `<span class="flag buff">能${unit.clearcast}</span>` : '',
    unit.metaTurns > 0 && !dead ? `<span class="flag buff">变${unit.metaTurns}</span>` : '',
    unit.ebonTurns > 0 && !dead ? `<span class="flag buff">檀${unit.ebonTurns}</span>` : '',
    opts.prescience && !dead ? `<span class="flag buff">暴+${opts.prescience}</span>` : '',
    unit.nextTakenAmp > 0 && !dead ? `<span class="flag stun">下易${unit.nextTakenAmp}%</span>` : '',
    unit.magiTurns > 0 && !dead ? `<span class="flag stun">触${unit.magiStored}</span>` : '',
    unit.takenAmp > 0 && !dead ? `<span class="flag stun">易${unit.takenAmp}%</span>` : '',
    unit.healTakenPct < 100 && !dead ? '<span class="flag stun">创</span>' : '',
    unit.priorityAct && !dead ? '<span class="flag buff">额</span>' : '',
    unit.eleOverloadTurns > 0 && !dead ? `<span class="flag buff">腾${unit.eleOverloadTurns}</span>` : '',
    unit.chaosStacks > 0 && !dead ? `<span class="flag buff">混${unit.chaosStacks * 20}%</span>` : '',
    opts.havoced && !dead ? '<span class="flag buff">劫</span>' : '',
  ].join('')

  const slotCls = [
    'card-slot',
    unit.side,
    opts.actor ? 'is-actor' : '',
    opts.acting ? 'is-casting' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return `
    <div class="${slotCls}">
      <button type="button"
        class="card battle-card ${dead ? 'is-dead' : ''} ${opts.selected ? 'is-selected' : ''} ${opts.inspected ? 'is-inspect' : ''} ${opts.targetable ? 'is-target' : ''} ${opts.dimmed ? 'is-dim' : ''} ${opts.acting ? 'is-acting' : ''} ${opts.actor ? 'is-actor' : ''} ${unit.side} ${unit.isPet ? 'is-pet' : ''} ${unit.shield > 0 && !dead ? 'has-shield' : ''} ${staggerLeft > 0 && !dead ? 'is-staggered' : ''} ${unit.specId === 'shaman-ele' && !dead ? 'has-roots' : ''} ${unit.eleOverloadTurns > 0 && !dead ? 'is-overloaded' : ''} ${unit.dmgAmp === 20 && !dead ? 'has-pi' : ''} ${opts.havoced && !dead ? 'has-havoc' : ''} ${unit.healTakenPct < 100 && !dead ? 'has-mortal' : ''} ${unit.takenAmp > 0 && !dead ? 'has-sunder' : ''} ${unit.magiTurns > 0 && !dead ? 'has-magi' : ''} ${unit.metaTurns > 0 && !dead ? 'has-meta' : ''} ${unit.ebonTurns > 0 && !dead ? 'has-ebon' : ''} ${unit.nextTakenAmp > 0 && !dead ? 'has-next-vuln' : ''} ${opts.showExecute && !dead && unit.hp / unit.maxHp < 0.35 ? 'is-execute-range' : ''}"
        data-uid="${unit.uid}"
        data-spec="${unit.specId}"
        style="--class:${spec.color}">
        <div class="card-art">${specArtImg(spec, unit.skinId, !dead)}${
          opts.acting && opts.cueIcon
            ? `<img class="skill-badge" src="${opts.cueIcon}" alt="" />`
            : ''
        }</div>
        <div class="card-meta">
          <div class="card-title">${unit.isPet ? spec.specName : `${spec.className}·${spec.specName}`}</div>
          <div class="hp-row">
            ${roleIconSvg(spec.role)}
            <div class="hp-stack">
              <div class="hp-bar ${opts.showExecute && hpPct < 35 ? 'is-low-exec' : ''}"><i style="width:${hpPct}%"></i>${opts.showExecute ? '<span class="exec-line" title="斩杀线 35%"></span>' : ''}</div>
              ${
                unit.hasStagger
                  ? `<div class="stagger-bar" title="醉拳待偿还 ${staggerLeft}"><i style="width:${Math.min(100, (staggerLeft / unit.maxHp) * 100)}%"></i></div>`
                  : ''
              }
            </div>
            <span class="hp-text">${unit.hp}/${unit.maxHp}</span>
          </div>
          <div class="status-row">${flags}</div>
        </div>
        <div class="float-layer" data-float="${unit.uid}"></div>
      </button>
    </div>
  `
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
