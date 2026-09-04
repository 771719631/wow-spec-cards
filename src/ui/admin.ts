import { FX_OPTIONS, battleParams, fxFor, patchBattle, patchSkill, patchSpec, resetAll, resetSpec, skillPatch } from '../data/config-store'
import { allSfxRel, skillSoundRel } from '../data/sounds'
import { CLASS_ORDER, ROLE_LABEL, SPECS, getBaseSpec, getSpec } from '../data/specs'
import type { SkillDef, SkillId, SpecDef } from '../engine/types'
import { wowIcon } from '../engine/types'
import { escapeHtml, specArtImg } from './card'

export type AdminTab = 'spec' | 'skill' | 'sfx' | 'assets' | 'battle' | 'other'

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'spec', label: '职业配置' },
  { id: 'skill', label: '技能配置' },
  { id: 'sfx', label: '音效管理' },
  { id: 'assets', label: '资源管理' },
  { id: 'battle', label: '战斗参数' },
  { id: 'other', label: '其他设置' },
]

const CLASS_LINE: Record<string, string> = {
  warrior: '坚韧的防御者，掌控战场的节奏。',
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

let tab: AdminTab = 'spec'
let specId = 'warrior-prot'
let skillId: SkillId = 'aa'
let query = ''
let toast = ''

export function setAdminTab(next: AdminTab): void {
  tab = next
}

export function adminHtml(): string {
  return `
    <div class="admin-screen">
      <header class="admin-head">
        <div class="admin-brand">
          <span class="admin-gear" aria-hidden="true">⚙</span>
          游戏后台管理系统
        </div>
        <nav class="admin-tabs" aria-label="后台分页">
          ${TABS.map((t) => `<button type="button" class="admin-tab ${tab === t.id ? 'is-on' : ''}" data-admin-tab="${t.id}">${t.label}</button>`).join('')}
        </nav>
        <button type="button" class="btn gold" data-go="title">返回游戏</button>
      </header>
      ${tabBody()}
      ${toast ? `<div class="admin-toast">${escapeHtml(toast)}</div>` : ''}
    </div>
  `
}

export function bindAdmin(root: HTMLElement, rerender: () => void): void {
  const ping = (msg: string) => {
    toast = msg
    rerender()
    window.setTimeout(() => {
      if (toast === msg) {
        toast = ''
        rerender()
      }
    }, 1400)
  }

  root.querySelectorAll<HTMLButtonElement>('[data-admin-tab]').forEach((el) => {
    el.addEventListener('click', () => {
      tab = el.dataset.adminTab as AdminTab
      rerender()
    })
  })
  root.querySelector<HTMLInputElement>('[data-admin-search]')?.addEventListener('input', (ev) => {
    const inp = ev.target as HTMLInputElement
    query = inp.value
    const pos = inp.selectionStart
    rerender()
    const next = document.querySelector<HTMLInputElement>('[data-admin-search]')
    next?.focus()
    if (pos != null) next?.setSelectionRange(pos, pos)
  })
  root.querySelectorAll<HTMLButtonElement>('[data-admin-spec]').forEach((el) => {
    el.addEventListener('click', () => {
      specId = el.dataset.adminSpec!
      const spec = getSpec(specId)
      if (!spec.skills.some((s) => s.id === skillId)) skillId = spec.skills[0].id
      rerender()
    })
  })
  root.querySelectorAll<HTMLButtonElement>('[data-admin-skill]').forEach((el) => {
    el.addEventListener('click', () => {
      skillId = el.dataset.adminSkill as SkillId
      rerender()
    })
  })
  root.querySelector('[data-admin-save-spec]')?.addEventListener('click', () => {
    saveSpecForm(root)
    ping('专精属性已保存')
  })
  root.querySelector('[data-admin-save-skill]')?.addEventListener('click', () => {
    saveSkillForm(root)
    ping('技能已保存')
  })
  root.querySelector('[data-admin-cancel-skill]')?.addEventListener('click', () => {
    rerender()
    ping('已还原')
  })
  root.querySelector('[data-admin-play-sfx]')?.addEventListener('click', () => {
    const sel = root.querySelector<HTMLSelectElement>('[name="sound"]')
    const rel = sel?.value
    if (!rel) return
    const base = import.meta.env.BASE_URL
    const audio = new Audio(encodeURI(`${base}${rel}`))
    audio.volume = 0.6
    void audio.play().catch(() => {})
  })
  root.querySelector('[data-admin-save-battle]')?.addEventListener('click', () => {
    const num = (name: string, fallback: number) => {
      const v = Number(root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value)
      return Number.isFinite(v) ? v : fallback
    }
    const cur = battleParams()
    patchBattle({
      maxSp: num('maxSp', cur.maxSp),
      startSp: num('startSp', cur.startSp),
      defaultCrit: num('defaultCrit', cur.defaultCrit),
      defaultCritDmg: num('defaultCritDmg', cur.defaultCritDmg),
    })
    ping('战斗参数已保存')
  })
  root.querySelector('[data-admin-reset-spec]')?.addEventListener('click', () => {
    resetSpec(specId)
    rerender()
    ping('已恢复该专精默认')
  })
  root.querySelector('[data-admin-reset-all]')?.addEventListener('click', () => {
    resetAll()
    rerender()
    ping('已恢复全部默认')
  })
  root.querySelectorAll<HTMLButtonElement>('[data-sfx-play]').forEach((el) => {
    el.addEventListener('click', () => {
      const rel = el.dataset.sfxPlay
      if (!rel) return
      const audio = new Audio(encodeURI(`${import.meta.env.BASE_URL}${rel}`))
      audio.volume = 0.6
      void audio.play().catch(() => {})
    })
  })
  root.querySelectorAll<HTMLSelectElement>('[data-sfx-assign]').forEach((el) => {
    el.addEventListener('change', () => {
      const sid = el.dataset.spec as string
      const kid = el.dataset.skill as SkillId
      patchSkill(sid, kid, { sound: el.value })
      ping('音效已更新')
    })
  })
}

function tabBody(): string {
  if (tab === 'sfx') return sfxPanel()
  if (tab === 'assets') return assetsPanel()
  if (tab === 'battle') return battlePanel()
  if (tab === 'other') return otherPanel()
  return editorPanel(tab === 'skill')
}

function filteredSpecs(): SpecDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return SPECS
  return SPECS.filter((s) => `${s.className}${s.specName}${s.id}`.toLowerCase().includes(q))
}

function specListHtml(): string {
  const groups = CLASS_ORDER.map((classId) => {
    const specs = filteredSpecs().filter((s) => s.classId === classId)
    if (!specs.length) return ''
    const rows = specs
      .map((s) => {
        const live = getSpec(s.id)
        const on = live.id === specId ? 'is-on' : ''
        return `
          <button type="button" class="admin-spec ${on}" data-admin-spec="${live.id}" style="--class:${live.color}">
            ${specArtImg(live)}
            <span>
              <b>${escapeHtml(live.specName)}</b>
              <small>${escapeHtml(live.className)} · ${ROLE_LABEL[live.role]}</small>
            </span>
          </button>
        `
      })
      .join('')
    return `<div class="admin-class">${rows}</div>`
  }).join('')
  return `
    <aside class="admin-rail">
      <input class="admin-search" data-admin-search type="search" placeholder="搜索专精..." value="${escapeHtml(query)}" />
      <div class="admin-spec-list">${groups || '<p class="hint">没有匹配的专精</p>'}</div>
    </aside>
  `
}

function editorPanel(skillsOnly: boolean): string {
  const spec = getSpec(specId)
  const skill = spec.skills.find((s) => s.id === skillId) ?? spec.skills[0]
  skillId = skill.id
  return `
    <div class="admin-body">
      ${specListHtml()}
      <main class="admin-mid">
        ${skillsOnly ? '' : specStatsHtml(spec)}
        ${skillListHtml(spec, skill.id)}
      </main>
      ${skillEditHtml(spec, skill)}
    </div>
  `
}

function specStatsHtml(spec: SpecDef): string {
  return `
    <section class="admin-card">
      <header class="admin-card-head">
        <div class="admin-ident" style="--class:${spec.color}">
          ${specArtImg(spec)}
          <div>
            <h2>${escapeHtml(spec.className)} · ${escapeHtml(spec.specName)}</h2>
            <p>${escapeHtml(CLASS_LINE[spec.classId] ?? '')}</p>
          </div>
        </div>
      </header>
      <h3>基础属性</h3>
      <div class="admin-fields">
        ${numField('maxHp', '生命值', spec.maxHp)}
        ${numField('speed', '速度', spec.speed)}
        ${numField('atk', '攻击力', spec.atk)}
        ${numField('crit', '暴击率', spec.crit, '%')}
        ${numField('critDmg', '暴击伤害', spec.critDmg, '%')}
      </div>
      <div class="admin-actions">
        <button type="button" class="btn gold" data-admin-save-spec>保存属性</button>
      </div>
    </section>
  `
}

function skillListHtml(spec: SpecDef, current: SkillId): string {
  const rows = spec.skills
    .map((s) => {
      const on = s.id === current ? 'is-on' : ''
      return `
        <button type="button" class="admin-skill ${on}" data-admin-skill="${s.id}">
          <img src="${wowIcon(s.icon)}" alt="" />
          <span>
            <b>${escapeHtml(s.name)}</b>
            <small>${costLabel(s)} · ${escapeHtml(s.desc)}</small>
          </span>
          <em>编辑</em>
        </button>
      `
    })
    .join('')
  return `
    <section class="admin-card">
      <header class="admin-card-head">
        <h3>技能配置 <small>${spec.skills.length}/4</small></h3>
      </header>
      <div class="admin-skill-list">${rows}</div>
    </section>
  `
}

function skillEditHtml(spec: SpecDef, skill: SkillDef): string {
  const mode = skill.gainSp ? 'gain' : skill.cost > 0 ? 'spend' : 'free'
  const amount = skill.gainSp ? skill.gainSp : skill.cost
  const sounds = allSfxRel()
  const patchedSound = skillPatch(spec.id, skill.id)?.sound || skillSoundRel(spec.id, skill.id, spec.classId) || sounds[0]
  const fx = fxFor(spec.id, skill.id)
  return `
    <aside class="admin-edit">
      <header class="admin-edit-head">
        <img src="${wowIcon(skill.icon)}" alt="" />
        <div>
          <h3>${escapeHtml(skill.name)}</h3>
          <p>${costLabel(skill)}</p>
        </div>
      </header>
      <h4>基础设置</h4>
      <label>技能名称<input name="name" value="${escapeHtml(skill.name)}" /></label>
      <div class="admin-split">
        <label>技能消耗
          <select name="costMode">
            <option value="spend" ${mode === 'spend' ? 'selected' : ''}>消耗技能点</option>
            <option value="gain" ${mode === 'gain' ? 'selected' : ''}>回复技能点</option>
            <option value="free" ${mode === 'free' ? 'selected' : ''}>无消耗</option>
          </select>
        </label>
        <label>点数<input name="costAmt" type="number" min="0" step="1" value="${amount}" /></label>
      </div>
      <label>伤害系数<input name="value" type="number" min="0" step="1" value="${skill.effect.value}" /> <span class="suffix">%</span></label>
      <label>冷却回合<input name="cooldown" type="number" min="0" step="1" value="${skill.cooldown ?? 0}" /></label>
      <label>技能描述<textarea name="desc" rows="4">${escapeHtml(skill.desc)}</textarea></label>
      <h4>资源配置</h4>
      <label>技能图标
        <div class="admin-pick">
          <img class="admin-icon-preview" src="${wowIcon(skill.icon)}" alt="" />
          <input name="icon" value="${escapeHtml(skill.icon)}" />
        </div>
      </label>
      <label>音效文件
        <div class="admin-pick">
          <select name="sound">
            ${sounds.map((p) => `<option value="${escapeHtml(p)}" ${p === patchedSound ? 'selected' : ''}>${escapeHtml(p.replace(/^sfx\//, ''))}</option>`).join('')}
          </select>
          <button type="button" class="btn ghost" data-admin-play-sfx>试听</button>
        </div>
      </label>
      <label>特效资源
        <select name="fx">
          ${FX_OPTIONS.map((f) => `<option value="${f}" ${f === fx ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </label>
      <div class="admin-edit-foot">
        <button type="button" class="btn ghost" data-admin-cancel-skill>取消</button>
        <button type="button" class="btn gold" data-admin-save-skill>保存修改</button>
      </div>
    </aside>
  `
}

function currentSound(specId: string, skillId: SkillId, classId: string): string {
  return skillPatch(specId, skillId)?.sound || skillSoundRel(specId, skillId, classId) || allSfxRel()[0]
}

function sfxPanel(): string {
  const sounds = allSfxRel()
  const rows = SPECS.flatMap((s) => {
    const live = getSpec(s.id)
    return live.skills.map((sk) => {
      const cur = currentSound(live.id, sk.id, live.classId)
      return `
        <tr>
          <td>${escapeHtml(live.className)}·${escapeHtml(live.specName)}</td>
          <td>${escapeHtml(sk.name)}</td>
          <td>
            <select data-sfx-assign data-spec="${live.id}" data-skill="${sk.id}">
              ${sounds.map((p) => `<option value="${escapeHtml(p)}" ${p === cur ? 'selected' : ''}>${escapeHtml(p.replace(/^sfx\//, ''))}</option>`).join('')}
            </select>
          </td>
          <td><button type="button" class="btn ghost" data-sfx-play="${escapeHtml(cur)}">试听</button></td>
        </tr>
      `
    })
  }).join('')
  return `
    <div class="admin-panel">
      <section class="admin-card">
        <h2>音效管理</h2>
        <p class="hint">本地 OGG，保存在 素材/sfx。修改后战斗会立刻使用新文件。</p>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>专精</th><th>技能</th><th>音效</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    </div>
  `
}

function assetsPanel(): string {
  const cards = SPECS.map((s) => {
    const live = getSpec(s.id)
    return `
      <figure class="admin-asset" style="--class:${live.color}">
        ${specArtImg(live)}
        <figcaption>${escapeHtml(live.className)}·${escapeHtml(live.specName)}</figcaption>
      </figure>
    `
  }).join('')
  return `
    <div class="admin-panel">
      <section class="admin-card">
        <h2>资源管理</h2>
        <p class="hint">专精卡面来自本地 素材/spec，皮肤视频来自 素材/skins。</p>
        <div class="admin-asset-grid">${cards}</div>
      </section>
    </div>
  `
}

function battlePanel(): string {
  const p = battleParams()
  return `
    <div class="admin-panel">
      <section class="admin-card admin-card-narrow">
        <h2>战斗参数</h2>
        ${numField('maxSp', '技能点上限', p.maxSp)}
        ${numField('startSp', '开场技能点', p.startSp)}
        ${numField('defaultCrit', '默认暴击率', p.defaultCrit, '%')}
        ${numField('defaultCritDmg', '默认暴击伤害', p.defaultCritDmg, '%')}
        <div class="admin-actions">
          <button type="button" class="btn gold" data-admin-save-battle>保存参数</button>
        </div>
      </section>
    </div>
  `
}

function otherPanel(): string {
  return `
    <div class="admin-panel">
      <section class="admin-card admin-card-narrow">
        <h2>其他设置</h2>
        <p class="hint">后台改动保存在本机浏览器。恢复默认不会改游戏源码。</p>
        <div class="admin-actions">
          <button type="button" class="btn ghost" data-admin-reset-spec>恢复当前专精</button>
          <button type="button" class="btn" data-admin-reset-all>恢复全部默认</button>
        </div>
      </section>
    </div>
  `
}

function numField(name: string, label: string, value: number, suffix = ''): string {
  return `<label>${label}<span class="admin-num"><input name="${name}" type="number" step="1" value="${value}" />${suffix ? `<em>${suffix}</em>` : ''}</span></label>`
}

function costLabel(skill: SkillDef): string {
  if (skill.passive) return '被动'
  if (skill.gainSp) return `回复 ${skill.gainSp} 点技能点`
  if (skill.cost > 0) return `消耗 ${skill.cost} 点技能点`
  return '无消耗'
}

function saveSpecForm(root: HTMLElement): void {
  const num = (name: string) => Number(root.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value)
  patchSpec(specId, {
    maxHp: num('maxHp'),
    speed: num('speed'),
    atk: num('atk'),
    crit: num('crit'),
    critDmg: num('critDmg'),
  })
}

function saveSkillForm(root: HTMLElement): void {
  const val = (name: string) => root.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)?.value ?? ''
  const mode = val('costMode')
  const amt = Number(val('costAmt')) || 0
  const cost = mode === 'spend' ? amt : 0
  const gainSp = mode === 'gain' ? amt : null
  patchSkill(specId, skillId, {
    name: val('name').trim() || getBaseSpec(specId).skills.find((s) => s.id === skillId)!.name,
    icon: val('icon').trim(),
    cost,
    gainSp,
    cooldown: Number(val('cooldown')) || 0,
    value: Number(val('value')) || 0,
    desc: val('desc'),
    sound: val('sound'),
    fx: val('fx'),
  })
}
