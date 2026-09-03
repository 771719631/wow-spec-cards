import { getSpec } from '../data/specs'
import { skillSoundUrl } from '../data/sounds'

let current: HTMLAudioElement | null = null

export function playSkillSfx(specId: string, skillId: string, opts?: { overlap?: boolean }): void {
  const spec = getSpec(specId)
  const url = skillSoundUrl(specId, skillId, spec.classId)
  if (!url) return
  try {
    if (!opts?.overlap && current) {
      current.pause()
      current.src = ''
    }
    const audio = new Audio(url)
    audio.volume = opts?.overlap ? 0.48 : 0.55
    if (!opts?.overlap) current = audio
    void audio.play().catch(() => {})
  } catch {
    /* autoplay / missing file */
  }
}
