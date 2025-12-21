#!/usr/bin/env python3
"""
Process beat masters in server/public/assets/beats/new:

- Detect BPM (approx) + musical key (approx) from WAV audio
- Convert WAV -> MP3 (320k)
- Propose standardized filenames: artist__beatname_key_bpm.{wav,mp3}
- Optionally apply: write into server/public/assets/beats/{wav,mp3}

Notes:
- Key/BPM detection is heuristic; review the dry-run report before applying.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


NEW_DIR = Path("server/public/assets/beats/new")
OUT_WAV_DIR = Path("server/public/assets/beats/wav")
OUT_MP3_DIR = Path("server/public/assets/beats/mp3")


def _strip_accents(s: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))


def slugify_beat_name(name: str) -> str:
    """
    Converts beat display name to the filesystem slug used in existing assets:
    - lower
    - spaces -> underscores
    - keep alnum and underscores and dots (for 'no._9' style), drop other punctuation
    """
    s = _strip_accents(name).lower().strip()
    s = s.replace("&", "and")
    s = re.sub(r"\s+", "_", s)
    # allow dot only when surrounded by word chars/underscores/numbers
    s = re.sub(r"[^a-z0-9_.]+", "", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "untitled"


def normalize_title(s: str) -> str:
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"\(prod\.\s*muz\)", "", s, flags=re.IGNORECASE).strip()
    s = re.sub(r"\s+", " ", s).strip()
    return s


QUOTE_RE = re.compile(r'["“”](.*?)["“”]')


def extract_beat_display_name(filename_stem: str) -> str:
    """
    Try to extract the beat name (the quoted portion, if present).
    Falls back to the part after the last '-' if there are no quotes.
    """
    s = normalize_title(filename_stem)
    m = QUOTE_RE.search(s)
    if m:
        return m.group(1).strip()
    # common patterns like: "Artist Type Beat - Name"
    if " - " in s:
        return s.split(" - ")[-1].strip()
    return s.strip()


def infer_artist_slug(filename_stem: str) -> str:
    """
    Infer the artist slug portion (left side of artist__beatname...).

    Rule: choose the first named artist before "Type Beat" (if present),
    handling "x" collaborations by taking the first part.
    """
    s = normalize_title(filename_stem)

    # Drop common leading tags like "*free for profit*" (or bracketed "[FREE]").
    s = re.sub(r"^\*.*?\*\s*", "", s).strip()
    s = re.sub(r"^\[.*?\]\s*", "", s).strip()

    # Extract the part before "Type Beat"
    m = re.search(r"^(.*?)\s+type\s+beat", s, flags=re.IGNORECASE)
    left = (m.group(1) if m else s).strip()

    # normalize variants like "Pi'erre" and smart quotes
    left = left.replace("Pi'erre", "Pierre")

    # Split collaborations like "A x B" / "A X B" and keep the first artist
    left = re.split(r"\s+[xX]\s+", left)[0].strip()

    # If there are descriptive adjectives in front of the artist, drop them.
    # (e.g., "Dark Drake" -> "Drake", "Happy Pierre Bourne" -> "Pierre Bourne")
    descriptors = {
        "dark",
        "happy",
        "euphoric",
        "experimental",
        "melodic",
        "spacy",
        "aggressive",
        "sad",
        "rage",
    }
    tokens = left.split()
    while tokens and tokens[0].lower() in descriptors:
        tokens = tokens[1:]
    left = " ".join(tokens).strip()

    # Map well-known multi-word artists to the repo's existing slug conventions.
    left_norm = _strip_accents(left).lower()
    left_norm = left_norm.replace("’", "'").replace("‘", "'")
    left_norm = left_norm.replace("'", "")
    left_norm = re.sub(r"\s+", " ", left_norm).strip()

    known_map = {
        "pierre bourne": "pierre_bourne",
        "internet money": "internet_money",
        "shoreline mafia": "shoreline_mafia",
        "thouxanbanfauni": "thouxanbanfauni",
        "playboi carti": "playboi_carti",
        "trippie redd": "trippie_redd",
        "tay-k": "tay-k",
        "tay k": "tay-k",
        "mike sherm": "mike_sherm",
    }
    if left_norm in known_map:
        return known_map[left_norm]

    # Fall back to a slug from the cleaned text
    slug = re.sub(r"[^a-z0-9]+", "_", left_norm).strip("_")
    return slug or "unknown"


PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def key_to_slug(key: str) -> str:
    """
    Convert to existing slug style, e.g.:
    - A minor  -> Amin
    - C# major -> Csmaj
    """
    key = key.strip()
    m = re.match(r"^([A-G])(#|b)?\s*(maj|min)$", key, flags=re.IGNORECASE)
    if not m:
        return "Unknown"
    root = m.group(1).upper()
    accidental = (m.group(2) or "").lower()
    mode = m.group(3).lower()
    if accidental == "#":
        root_slug = f"{root}s"
    elif accidental == "b":
        root_slug = f"{root}b"
    else:
        root_slug = root
    return f"{root_slug}{'maj' if mode == 'maj' else 'min'}"


def _require_ffmpeg() -> None:
    try:
        subprocess.run(["ffmpeg", "-version"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        raise SystemExit("ffmpeg not found. Install ffmpeg (brew install ffmpeg) and retry.") from e


def detect_bpm_and_key(wav_path: Path) -> Tuple[int, str]:
    """
    Heuristic analysis:
    - BPM via librosa.beat.tempo (median)
    - Key via chroma profile correlation (Krumhansl-Schmuckler)
    """
    import numpy as np  # type: ignore
    import librosa  # type: ignore

    y, sr = librosa.load(str(wav_path), sr=22050, mono=True)  # lighter + consistent
    # trim silence to reduce tempo confusion
    yt, _ = librosa.effects.trim(y, top_db=30)
    if yt.size < sr * 5:
        yt = y  # fallback

    # BPM
    onset_env = librosa.onset.onset_strength(y=yt, sr=sr)
    # librosa API differs by version; support both old and new locations.
    tempo_fn = None
    try:
        tempo_fn = getattr(getattr(getattr(librosa, "feature", None), "rhythm", None), "tempo", None)
    except Exception:
        tempo_fn = None
    if tempo_fn is None:
        tempo_fn = getattr(getattr(librosa, "beat", None), "tempo", None)
    if tempo_fn is None:
        tempos = []
    else:
        tempos = tempo_fn(onset_envelope=onset_env, sr=sr, aggregate=None)
    if tempos is None or len(tempos) == 0:
        bpm = 0
    else:
        bpm = int(round(float(np.median(tempos))))
        # common double/half-time adjustment: constrain to [70, 200]
        while bpm > 200:
            bpm = int(round(bpm / 2))
        while 0 < bpm < 70:
            bpm = int(round(bpm * 2))

    # Key detection
    chroma = librosa.feature.chroma_cqt(y=yt, sr=sr)
    chroma_mean = chroma.mean(axis=1)
    chroma_mean = chroma_mean / (np.linalg.norm(chroma_mean) + 1e-9)

    # K-S key profiles (major/minor)
    maj_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    min_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    maj_profile = maj_profile / np.linalg.norm(maj_profile)
    min_profile = min_profile / np.linalg.norm(min_profile)

    best = (None, -1.0)  # (key_str, score)
    for i, root in enumerate(PITCH_CLASSES):
        maj = np.roll(maj_profile, i)
        minp = np.roll(min_profile, i)
        maj_score = float(np.dot(chroma_mean, maj))
        min_score = float(np.dot(chroma_mean, minp))
        if maj_score > best[1]:
            best = (f"{root} maj", maj_score)
        if min_score > best[1]:
            best = (f"{root} min", min_score)

    key_str = best[0] or "Unknown"
    # normalize to "Amin"/"Csmaj" style later
    m = re.match(r"^([A-G])(#|b)?\s+(maj|min)$", key_str)
    if m:
        root = m.group(1) + (m.group(2) or "")
        mode = m.group(3)
        key_str = f"{root}{mode}"
    else:
        key_str = "Unknown"

    return bpm, key_str


def wav_to_mp3(wav_path: Path, mp3_path: Path) -> None:
    _require_ffmpeg()
    mp3_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(wav_path),
            "-vn",
            "-ac",
            "2",
            "-ar",
            "44100",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "320k",
            str(mp3_path),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


@dataclass
class BeatPlan:
    source_wav: str
    artist_slug: str
    beat_display_name: str
    beat_slug: str
    bpm: int
    key: str
    key_slug: str
    out_basename: str
    out_wav: str
    out_mp3: str


def build_plan(wav_path: Path) -> BeatPlan:
    stem = wav_path.stem
    artist = infer_artist_slug(stem)
    beat_display = extract_beat_display_name(stem)
    beat_slug = slugify_beat_name(beat_display)
    bpm, key = detect_bpm_and_key(wav_path)
    key_slug = key_to_slug(key)
    # bpm: if detection failed, keep 0 so it's obvious
    bpm_str = str(bpm if bpm > 0 else 0)
    out_base = f"{artist}__{beat_slug}_{key_slug}_{bpm_str}"
    return BeatPlan(
        source_wav=str(wav_path),
        artist_slug=artist,
        beat_display_name=beat_display,
        beat_slug=beat_slug,
        bpm=bpm,
        key=key,
        key_slug=key_slug,
        out_basename=out_base,
        out_wav=str(OUT_WAV_DIR / f"{out_base}.wav"),
        out_mp3=str(OUT_MP3_DIR / f"{out_base}.mp3"),
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="Actually write/copy files into beats/wav and beats/mp3.")
    ap.add_argument("--limit", type=int, default=0, help="Limit number of WAVs processed (0 = all).")
    args = ap.parse_args()

    if not NEW_DIR.exists():
        raise SystemExit(f"Missing directory: {NEW_DIR}")

    wavs = sorted([p for p in NEW_DIR.iterdir() if p.is_file() and p.suffix.lower() == ".wav"])
    if args.limit and args.limit > 0:
        wavs = wavs[: args.limit]

    plans: List[BeatPlan] = []
    for p in wavs:
        plans.append(build_plan(p))

    # detect collisions
    seen = {}
    collisions = []
    for pl in plans:
        if pl.out_basename in seen:
            collisions.append((pl.source_wav, seen[pl.out_basename], pl.out_basename))
        else:
            seen[pl.out_basename] = pl.source_wav

    report_dir = Path("docs/audits")
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / "new_beats_plan.json"
    report_path.write_text(json.dumps([asdict(p) for p in plans], indent=2, ensure_ascii=False))

    print(f"Found WAVs: {len(wavs)}")
    print(f"Wrote plan: {report_path}")
    if collisions:
        print("WARNING: filename collisions detected (same output basename):")
        for a, b, base in collisions[:20]:
            print(f"- {base}: {a} AND {b}")
        print("Resolve collisions before applying.")

    if not args.apply:
        print("Dry run only. Re-run with --apply to write files.")
        return

    if collisions:
        raise SystemExit("Refusing to apply due to collisions. Fix first.")

    OUT_WAV_DIR.mkdir(parents=True, exist_ok=True)
    OUT_MP3_DIR.mkdir(parents=True, exist_ok=True)

    applied = 0
    for pl in plans:
        src = Path(pl.source_wav)
        out_wav = Path(pl.out_wav)
        out_mp3 = Path(pl.out_mp3)

        # copy WAV (keep original in /new)
        if not out_wav.exists():
            shutil.copy2(src, out_wav)

        # convert to MP3
        if not out_mp3.exists():
            wav_to_mp3(out_wav, out_mp3)

        applied += 1

    print(f"Applied: {applied} beats (copied WAV + created MP3 as needed)")


if __name__ == "__main__":
    main()


