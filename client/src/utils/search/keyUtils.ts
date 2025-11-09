/**
 * Utility functions and mappings for normalizing and comparing musical keys.
 *
 * This module provides:
 *  - ACCIDENTAL_MAP: canonical mapping of all supported accidentals
 *  - normalizeAccidental: normalize any accidental token to "#" or "b"
 *  - normalizeQuality: normalize any quality token to "maj" or "min"
 *  - normalizeKeyNotation: clean up full key strings for matching
 *  - getEnharmonicEquivalents: lookup enharmonic or relative keys
 */

/**
  * Maps symbol and word forms of accidentals to their
  * canonical single-character representation.
  *
  * @example
  * - ACCIDENTAL_MAP["#"]      // "#"
  * - ACCIDENTAL_MAP["♯"]      // "#"
  * - ACCIDENTAL_MAP["sharp"]  // "#"
  * - ACCIDENTAL_MAP["b"]      // "b"
  * - ACCIDENTAL_MAP["♭"]      // "b"
  * - ACCIDENTAL_MAP["flat"]   // "b"
  */
export const ACCIDENTAL_MAP: Record<string, string> = {
    "#":      "#",
    "♯":      "#",
    sharp:    "#",
    b:        "b",
    "♭":      "b",
    flat:     "b",
}

/**
 * Normalize an accidental token (symbol or word) to "#" or "b".
 *
 * @param token
 *   The accidental input, e.g. "#", "♯", "sharp", "b", "♭", or "flat"
 * @returns
 *   "#" or "b" if recognized, otherwise undefined
 *
 * @example
 * normalizeAccidental("#")      // "#"
 * normalizeAccidental("sharp")  // "#"
 * normalizeAccidental("♭")      // "b"
 * normalizeAccidental("unknown")// undefined
 */
export function normalizeAccidental(token: string): string | undefined {
    return ACCIDENTAL_MAP[token.toLowerCase()];
}

/**
 * Normalize a quality token to "maj" or "min".
 *
 * @param token
 *   The quality input, e.g. "major", "maj", "M", "minor", "min", or "m"
 * @returns
 *   "maj" or "min" if recognized, otherwise undefined
 *
 * @example
 * normalizeQuality("M")        // "maj"
 * normalizeQuality("major")    // "maj"
 * normalizeQuality("min")      // "min"
 * normalizeQuality("m")        // "min"
 * normalizeQuality("xyz")      // undefined
 */
export function normalizeQuality(token: string): string | undefined {
    const low = token.toLowerCase();
    if (low === "major" || low === "maj" || token === "M") return "maj";
    if (low === "minor" || low === "min" || token === "m")  return "min";
    return undefined;
}

// src/utils/search/keyUtils.ts

/**
 * Normalize a musical-key string into a consistent, lowercase token:
 *  1. map "♯"/"sharp" → "#",  "♭"/"flat" → "b"
 *  2. map "major" → "maj", "minor" → "min"
 *  3. strip all whitespace
 *  4. lowercase everything
 *
 * @example
 *   normalizeKeyNotation("C♯min")      //→ "c#min"
 *   normalizeKeyNotation("E flat Major") //→ "ebmaj"
 */
export function normalizeKeyNotation(input: string): string {
    return input
        // 1) normalize accidentals
        .replace(/♯|sharp/gi, "#")
        .replace(/♭|flat/gi, "b")
        // 2) collapse full‐word qualities
        .replace(/major/gi, "maj")
        .replace(/minor/gi, "min")
        // 3) remove spaces
        .replace(/\s+/g, "")
        // 4) lowercase
        .toLowerCase();
}

/**
 * Map of enharmonic and relative key equivalents.
 *
 * Keys sharing the same pitches but different spellings
 * or tonal centers are listed here for broader matching.
 */
const ENHARMONIC_MAP: Record<string, string[]> = {
    "cmaj": ["b#maj", "amin"],
    "b#maj": ["cmaj", "amin"],
    "amin": ["cmaj", "b#maj"],
    "gmaj": ["emin"],
    "emin": ["gmaj"],
    "dmaj": ["bmin"],
    "bmin": ["dmaj"],
    "amaj": ["f#min", "gbmin"],
    "f#min": ["amaj", "gbmin"],
    "gbmin": ["amaj", "f#min"],
    "emaj": ["c#min", "dbmin"],
    "c#min": ["emaj", "dbmin"],
    "dbmin": ["emaj", "c#min"],
    "bmaj": ["g#min", "abmin"],
    "g#min": ["bmaj", "abmin"],
    "abmin": ["bmaj", "g#min"],
    "f#maj": ["ebmin", "d#min"],
    "d#min": ["f#maj", "ebmin"],
    "ebmin": ["f#maj", "d#min"],
    "dbmaj": ["bbmin", "a#min"],
    "bbmin": ["dbmaj", "a#min"],
    "a#min": ["dbmaj", "bbmin"],
    "abmaj": ["fmin"],
    "fmin": ["abmaj"],
    "ebmaj": ["cmin"],
    "cmin": ["ebmaj"],
    "bbmaj": ["gmin", "a#maj"],
    "gmin": ["bbmaj", "a#maj"],
    "a#maj": ["bbmaj", "gmin"],
    "fmaj": ["dmin"],
    "dmin": ["fmaj"]
};

/**
 * Given a normalized key, return its enharmonic and
 * relative equivalents.
 *
 * - “Enharmonic” keys name the same pitches differently (C♯maj ↔ D♭maj)
 * - “Relative” keys share the same notes but different tonal centers
 *   (e.g. C major ↔ A minor)
 * 
 * @param key
 *   A normalized key string, e.g. "ebmin"
 * @returns
 *   Array of normalized equivalent key tokens
 *
 * @example
 * getEnharmonicEquivalents("ebmin") // ["f#maj","d#min"]
 * getEnharmonicEquivalents("cmaj") // ["b#maj","amin"]
 * getEnharmonicEquivalents("xyz")  // []
 */
export function getEnharmonicEquivalents(key: string): string[] {
    return ENHARMONIC_MAP[key] ?? [];
}
