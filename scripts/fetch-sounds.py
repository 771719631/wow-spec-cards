#!/usr/bin/env python3
"""Fetch Wowhead spell-cast OGGs and write src/data/sounds.ts"""
from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

UA = {"User-Agent": "Mozilla/5.0 WowSpecCards/1.0"}

# specId:skillId -> wowhead spell id
SPELLS: dict[str, int] = {
    "warrior-arms:aa": 12294,
    "warrior-arms:s1": 167105,
    "warrior-arms:s2": 260708,
    "warrior-arms:s3": 163201,
    "warrior-fury:aa": 23881,
    "warrior-fury:s1": 85288,
    "warrior-fury:s2": 190411,
    "warrior-fury:s3": 1719,
    "warrior-prot:aa": 23922,
    "warrior-prot:s1": 6572,
    "warrior-prot:s2": 871,
    "warrior-prot:s3": 469,
    "paladin-holy:aa": 35395,
    "paladin-holy:s1": 82326,
    "paladin-holy:s2": 19750,
    "paladin-holy:s3": 85222,
    "paladin-prot:aa": 20271,
    "paladin-prot:s1": 53600,
    "paladin-prot:s2": 31935,
    "paladin-prot:s3": 31850,
    "paladin-ret:aa": 35395,
    "paladin-ret:s1": 20271,
    "paladin-ret:s2": 53385,
    "paladin-ret:s3": 383328,
    "hunter-bm:aa": 193455,
    "hunter-bm:s1": 34026,
    "hunter-bm:s2": 883,
    "hunter-bm:s3": 19574,
    "hunter-mm:aa": 56641,
    "hunter-mm:s1": 19434,
    "hunter-mm:s2": 257620,
    "hunter-mm:s3": 288613,
    "hunter-sv:aa": 186270,
    "hunter-sv:s1": 259495,
    "hunter-sv:s2": 191433,
    "hunter-sv:s3": 269751,
    "rogue-assassination:aa": 1329,
    "rogue-assassination:s1": 32645,
    "rogue-assassination:s2": 1943,
    "rogue-assassination:s3": 385627,
    "rogue-outlaw:aa": 193315,
    "rogue-outlaw:s1": 185763,
    "rogue-outlaw:s2": 315341,
    "rogue-outlaw:s3": 315508,
    "rogue-subtlety:aa": 53,
    "rogue-subtlety:s1": 196819,
    "rogue-subtlety:s2": 408,
    "rogue-subtlety:s3": 319175,
    "priest-disc:aa": 585,
    "priest-disc:s1": 47540,
    "priest-disc:s2": 17,
    "priest-disc:s3": 120517,
    "priest-holy:aa": 585,
    "priest-holy:s1": 2061,
    "priest-holy:s2": 10060,
    "priest-holy:s3": 64843,
    "priest-shadow:aa": 8092,
    "priest-shadow:s1": 32379,
    "priest-shadow:s2": 589,
    "priest-shadow:s3": 228260,
    "dk-blood:aa": 49998,
    "dk-blood:s1": 51052,
    "dk-blood:s2": 195181,
    "dk-blood:s3": 49028,
    "dk-frost:aa": 49020,
    "dk-frost:s1": 49143,
    "dk-frost:s2": 49184,
    "dk-frost:s3": 51271,
    "dk-unholy:aa": 55090,
    "dk-unholy:s1": 85948,
    "dk-unholy:s2": 77575,
    "dk-unholy:s3": 42650,
    "shaman-ele:aa": 188443,  # Chain Lightning
    "shaman-ele:s1": 51505,  # Deeply Rooted Elements has no kit; Lava Burst = 升腾火球
    "shaman-ele:s2": 61882,  # Earthquake
    "shaman-ele:s3": 114050,  # Elemental Ascendance
    "shaman-enh:aa": 17364,
    "shaman-enh:s1": 60103,
    "shaman-enh:s2": 188389,
    "shaman-enh:s3": 114051,
    "shaman-resto:aa": 188196,
    "shaman-resto:s1": 77472,
    "shaman-resto:s2": 61295,
    "shaman-resto:s3": 108280,
    "mage-arcane:aa": 5143,  # Arcane Missiles
    "mage-arcane:s1": 44425,  # Prismatic Bolt has no live kit; Arcane Barrage
    "mage-arcane:s2": 263725,  # Clearcasting
    "mage-arcane:s3": 210833,  # Touch of the Magi explosion
    "mage-fire:aa": 133,
    "mage-fire:s1": 11366,
    "mage-fire:s2": 31661,
    "mage-fire:s3": 190319,
    "mage-frost:aa": 116,
    "mage-frost:s1": 30455,
    "mage-frost:s2": 122,
    "mage-frost:s3": 190356,
    "warlock-aff:aa": 686,
    "warlock-aff:s1": 316099,
    "warlock-aff:s2": 172,
    "warlock-aff:s3": 980,
    "warlock-demo:aa": 686,
    "warlock-demo:s1": 105174,
    "warlock-demo:s2": 196277,
    "warlock-demo:s3": 265187,
    "warlock-destro:aa": 29722,  # Incinerate
    "warlock-destro:s1": 116858,  # Chaos Bolt
    "warlock-destro:s2": 80240,  # Havoc
    "warlock-destro:s3": 5740,  # Rain of Fire
    "monk-brew:aa": 121253,
    "monk-brew:s1": 1241059,
    "monk-brew:s2": 115069,
    "monk-brew:s3": 132578,
    "monk-ww:aa": 100780,
    "monk-ww:s1": 107428,
    "monk-ww:s2": 101546,
    "monk-ww:s3": 107079,
    "monk-mw:aa": 100780,
    "monk-mw:s1": 115151,
    "monk-mw:s2": 115175,
    "monk-mw:s3": 116849,
    "druid-balance:aa": 5176,
    "druid-balance:s1": 78674,
    "druid-balance:s2": 8921,
    "druid-balance:s3": 191034,
    "druid-feral:aa": 5221,
    "druid-feral:s1": 22568,
    "druid-feral:s2": 1822,
    "druid-feral:s3": 106951,
    "druid-guardian:aa": 33917,
    "druid-guardian:s1": 6807,
    "druid-guardian:s2": 192081,
    "druid-guardian:s3": 61336,
    "druid-resto:aa": 5176,
    "druid-resto:s1": 774,
    "druid-resto:s2": 18562,
    "druid-resto:s3": 740,
    "dh-havoc:aa": 162794,  # Chaos Strike
    "dh-havoc:s1": 188499,  # Blade Dance
    "dh-havoc:s2": 198013,  # Eye Beam
    "dh-havoc:s3": 191427,  # Metamorphosis
    "dh-vengeance:aa": 203782,
    "dh-vengeance:s1": 228477,
    "dh-vengeance:s2": 203720,
    "dh-vengeance:s3": 187827,
    "dh-devourer:aa": 198013,
    "dh-devourer:s1": 228477,
    "dh-devourer:s2": 198013,
    "dh-devourer:s3": 228260,
    "evoker-dev:aa": 361469,
    "evoker-dev:s1": 362969,
    "evoker-dev:s2": 357208,
    "evoker-dev:s3": 359073,
    "evoker-pres:aa": 361469,
    "evoker-pres:s1": 364343,
    "evoker-pres:s2": 355913,
    "evoker-pres:s3": 355936,
    "evoker-aug:aa": 395160,  # Eruption
    "evoker-aug:s1": 409311,  # Prescience
    "evoker-aug:s2": 395152,  # Ebon Might
    "evoker-aug:s3": 357210,  # Deep Breath
}

CLASS_FALLBACK_SPELL = {
    "warrior": 12294,
    "paladin": 35395,
    "hunter": 19434,
    "rogue": 193315,
    "priest": 2061,
    "deathknight": 49998,
    "shaman": 188196,
    "mage": 133,
    "warlock": 686,
    "monk": 100780,
    "druid": 5176,
    "demonhunter": 162794,
    "evoker": 361469,
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=12) as res:
        return res.read().decode("utf-8", "replace")


def pick_ogg(kits: list) -> str | None:
    files = []
    for kit in kits:
        for f in kit.get("files") or []:
            url = f.get("url")
            title = f.get("title") or kit.get("name") or ""
            if url:
                files.append((title, url))
    if not files:
        return None

    def score(title: str) -> int:
        t = title.lower()
        n = 0
        if "precast" in t or "caststart" in t:
            n -= 4
        if re.search(r"(^|_)cast(_|$)|cast0|/cast", t) or "cast" in t:
            n += 6
        if "impact" in t or "hit" in t:
            n += 3
        if "launch" in t:
            n += 4
        if "heal" in t:
            n += 2
        return n

    files.sort(key=lambda x: score(x[0]), reverse=True)
    return files[0][1]


def extract_sounds(html: str) -> str | None:
    m = re.search(
        r"new Listview\(\{template: 'sound'[\s\S]*?data:(\[[\s\S]*?\])\}\);",
        html,
    )
    if not m:
        return None
    raw = m.group(1)
    try:
        kits = json.loads(raw)
    except json.JSONDecodeError:
        return None
    return pick_ogg(kits)


def main() -> None:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    unique_ids = sorted(set(SPELLS.values()) | set(CLASS_FALLBACK_SPELL.values()))
    print(f"fetching {len(unique_ids)} wowhead spells", flush=True)
    cache: dict[int, str | None] = {}

    def one(sid: int) -> tuple[int, str | None]:
        try:
            html = fetch(f"https://www.wowhead.com/spell={sid}")
            return sid, extract_sounds(html)
        except Exception as exc:
            print(f"FAIL {sid} {exc}", flush=True)
            return sid, None

    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, sid) for sid in unique_ids]
        for fut in as_completed(futs):
            sid, url = fut.result()
            cache[sid] = url
            done += 1
            print(f"[{done}/{len(unique_ids)}] {sid} -> {'ok' if url else 'none'}", flush=True)

    fallback_class = {
        cls: cache.get(sid) for cls, sid in CLASS_FALLBACK_SPELL.items() if cache.get(sid)
    }
    skill_map: dict[str, str] = {}
    missing = []
    for key, sid in SPELLS.items():
        url = cache.get(sid)
        if url:
            skill_map[key] = url
        else:
            missing.append(key)

    out = Path("/Users/caiyi/项目/魔兽职业对战/src/data/sounds.ts")
    lines = [
        "/** Wowhead spell-cast OGGs (zamimg sound-ids). */",
        "export const SKILL_SOUNDS: Record<string, string> = {",
    ]
    for key in sorted(skill_map):
        lines.append(f"  '{key}': '{skill_map[key]}',")
    lines += [
        "}",
        "",
        "export const CLASS_SOUNDS: Record<string, string> = {",
    ]
    for cls, url in fallback_class.items():
        lines.append(f"  '{cls}': '{url}',")
    lines += [
        "}",
        "",
        "export function skillSoundUrl(specId: string, skillId: string, classId: string): string | null {",
        "  return SKILL_SOUNDS[`${specId}:${skillId}`] ?? CLASS_SOUNDS[classId] ?? null",
        "}",
        "",
    ]
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {out} skills={len(skill_map)} missing={len(missing)}")
    if missing:
        print("missing", ", ".join(missing[:20]))


if __name__ == "__main__":
    main()
