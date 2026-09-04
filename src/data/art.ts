import { wowIcon } from '../engine/types'
import type { SpecDef } from '../engine/types'

export const CLASSIC_SKIN = 'classic'

export interface SkinDef {
  id: string
  name: string
  video?: string
  poster?: string
}

export const EXTRA_SKINS: SkinDef[] = [
  { id: 'beasts', name: '三兽', video: 'skins/beasts.mp4', poster: 'skins/beasts.jpg' },
  { id: 'meteors', name: '陨火', video: 'skins/meteors.mp4', poster: 'skins/meteors.jpg' },
  { id: 'bloodblade', name: '血刃', video: 'skins/bloodblade.mp4', poster: 'skins/bloodblade.jpg' },
  { id: 'frostaxe', name: '霜斧', video: 'skins/frostaxe.mp4', poster: 'skins/frostaxe.jpg' },
  { id: 'magma', name: '熔喉', video: 'skins/magma.mp4', poster: 'skins/magma.jpg' },
  { id: 'lightning', name: '天雷', video: 'skins/lightning.mp4', poster: 'skins/lightning.jpg' },
  { id: 'seraph', name: '灵翼', video: 'skins/seraph.mp4', poster: 'skins/seraph.jpg' },
  { id: 'winghelm', name: '翼盔', video: 'skins/winghelm.mp4', poster: 'skins/winghelm.jpg' },
  { id: 'radiance', name: '圣辉', video: 'skins/radiance.mp4', poster: 'skins/radiance.jpg' },
  { id: 'aegis', name: '圣盾', video: 'skins/aegis.mp4', poster: 'skins/aegis.jpg' },
  { id: 'gavel', name: '圣锤', video: 'skins/gavel.mp4', poster: 'skins/gavel.jpg' },
  { id: 'quarry', name: '穿杨', video: 'skins/quarry.mp4', poster: 'skins/quarry.jpg' },
  { id: 'verdant', name: '翠冠', video: 'skins/verdant.mp4', poster: 'skins/verdant.jpg' },
  { id: 'ebonshard', name: '黑曜', video: 'skins/ebonshard.mp4', poster: 'skins/ebonshard.jpg' },
  { id: 'azurebreath', name: '苍息', video: 'skins/azurebreath.mp4', poster: 'skins/azurebreath.jpg' },
  { id: 'blademask', name: '刃客', video: 'skins/blademask.mp4', poster: 'skins/blademask.jpg' },
  { id: 'umbral', name: '影面', video: 'skins/umbral.mp4', poster: 'skins/umbral.jpg' },
  { id: 'bulwark', name: '钢盾', video: 'skins/bulwark.mp4', poster: 'skins/bulwark.jpg' },
  { id: 'emerald', name: '翠徽', video: 'skins/emerald.mp4', poster: 'skins/emerald.jpg' },
]

/** One extra skin per spec. Everyone else stays on classic art. */
export const SPEC_SKINS: Record<string, string> = {
  'hunter-bm': 'beasts',
  'warlock-destro': 'meteors',
  'rogue-outlaw': 'bloodblade',
  'warrior-arms': 'frostaxe',
  'monk-brew': 'magma',
  'shaman-ele': 'lightning',
  'priest-holy': 'seraph',
  'warrior-fury': 'winghelm',
  'paladin-holy': 'radiance',
  'paladin-prot': 'aegis',
  'paladin-ret': 'gavel',
  'hunter-mm': 'quarry',
  'hunter-sv': 'verdant',
  'evoker-aug': 'ebonshard',
  'evoker-dev': 'azurebreath',
  'evoker-pres': 'emerald',
  'rogue-assassination': 'blademask',
  'rogue-subtlety': 'umbral',
  'warrior-prot': 'bulwark',
}

export function extraSkin(id: string): SkinDef | undefined {
  return EXTRA_SKINS.find((s) => s.id === id)
}

export function specExtraSkin(specId: string): SkinDef | undefined {
  const id = SPEC_SKINS[specId]
  return id ? extraSkin(id) : undefined
}

export function isClassicSkin(id: string | undefined): boolean {
  return !id || id === CLASSIC_SKIN
}

export function resolveSkin(specId: string, skinId?: string): string {
  const allowed = SPEC_SKINS[specId]
  if (allowed && skinId === allowed) return allowed
  return CLASSIC_SKIN
}

function asset(path: string): string {
  const base = import.meta.env.BASE_URL
  return encodeURI(`${base}${path.replace(/^\//, '')}`)
}

/** Relative to Vite publicDir (`素材/`). */
const SPEC_ART: Record<string, string> = {
  'warrior-arms': 'spec/warrior/arms.png_2K_202609021405.jpeg',
  'warrior-fury': 'spec/warrior/fury.png_202609021409.jpeg',
  'warrior-prot': 'spec/warrior/protection.png_2K_202609021404.jpeg',
  'paladin-holy': 'spec/paladin/holy.png_2K_202609021338.jpeg',
  'paladin-prot': 'spec/paladin/protection.png_2K_202609021338.jpeg',
  'paladin-ret': 'spec/paladin/retribution.png_2K_202609021338.jpeg',
  'hunter-bm': 'spec/hunter/beastmastery.png_2K_202609021334.jpeg',
  'hunter-mm': 'spec/hunter/marksman.png_2K_202609021334.jpeg',
  'hunter-sv': 'spec/hunter/survival.png_2K_202609021333.jpeg',
  'rogue-assassination': 'spec/rogue/assassination.png_202609021408.jpeg',
  'rogue-outlaw': 'spec/rogue/combat.png_2K_202609021404.jpeg',
  'rogue-subtlety': 'spec/rogue/subtlety.png_2K_202609021405.jpeg',
  'priest-disc': 'spec/priest/discipline.png_202609021408.jpeg',
  'priest-holy': 'spec/priest/holy.png_2K_202609021407.jpeg',
  'priest-shadow': 'spec/priest/shadow.png_2K_202609021407.jpeg',
  'dk-blood': 'spec/deathknight/blood.png_2K_202609021320.jpeg',
  'dk-frost': 'spec/deathknight/frost.png_2K_202609021320.jpeg',
  'dk-unholy': 'spec/deathknight/unholy.png_2K_202609021320.jpeg',
  'shaman-ele': 'spec/shaman/elemental.png_202609021409.jpeg',
  'shaman-enh': 'spec/shaman/image.png_2K_202609021405.jpeg',
  'shaman-resto': 'spec/shaman/restoration.png_202609021409.jpeg',
  'mage-arcane': 'spec/mage/arcane.png_2K_202609021338.jpeg',
  'mage-fire': 'spec/mage/fire.png_2K_202609021338.jpeg',
  'mage-frost': 'spec/mage/frost.png_2K_202609021337.jpeg',
  'warlock-aff': 'spec/warlock/affliction.png_202609021412.jpeg',
  'warlock-demo': 'spec/warlock/demonology.png_202609021412.jpeg',
  'warlock-destro': 'spec/warlock/destruction.png_202609021412.jpeg',
  'monk-brew': 'spec/monk/brewmaster.png_2K_202609021337.jpeg',
  'monk-ww': 'spec/monk/windwalker.png_2K_202609021336.jpeg',
  'monk-mw': 'spec/monk/mistweaver.png_2K_202609021337.jpeg',
  'druid-balance': 'spec/druid/balance.png_2K_202609021323.jpeg',
  'druid-feral': 'spec/druid/feral.png_2K_202609021323.jpeg',
  'druid-guardian': 'spec/druid/guardian.png_2K_202609021323.jpeg',
  'druid-resto': 'spec/druid/restoration.png_2K_202609021323.jpeg',
  'dh-havoc': 'spec/dh/浩劫.jpeg',
  'dh-vengeance': 'spec/dh/复仇.jpeg',
  'dh-devourer': 'spec/dh/噬灭.jpeg',
  'evoker-dev': 'spec/龙/湮灭.jpeg',
  'evoker-pres': 'spec/龙/恩护.jpeg',
  'evoker-aug': 'spec/龙/增辉.jpeg',
}

export function specArtUrl(spec: SpecDef): string {
  const file = SPEC_ART[spec.id]
  if (file) return asset(file)
  return wowIcon(spec.icon)
}

export function hasLocalArt(specId: string): boolean {
  return specId in SPEC_ART
}

export function stillUrl(spec: SpecDef, skinId?: string): string {
  const extra = specExtraSkin(spec.id)
  if (extra?.poster && skinId === extra.id) return asset(extra.poster)
  return specArtUrl(spec)
}

export function videoUrl(spec: SpecDef, skinId?: string): string | null {
  const extra = specExtraSkin(spec.id)
  if (extra?.video && skinId === extra.id) return asset(extra.video)
  return null
}
