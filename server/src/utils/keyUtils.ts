/**
* Utility functions for musical key normalization and enharmonic equivalents
* Ported from client/src/utils/search/keyUtils.ts
*/

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
* Normalize a key string to a consistent format
* Converts: "C# min" -> "c#min", "A flat major" -> "abmaj", etc.
*/
export function normalizeKeyNotation(input: string): string {
    // First normalize accidentals and full words
    let normalized = input
        // Normalize accidentals
        .replace(/♯|sharp/gi, '#')
        .replace(/♭|flat/gi, 'b')
        // Normalize quality
        .replace(/major/gi, 'maj')
        .replace(/minor/gi, 'min');
    
    // Handle single letter quality - check uppercase M FIRST (before lowercase m)
    // This ensures "CM" -> "cmaj" not "cmin"
    // Note: [A-Ga-g] matches both uppercase and lowercase note letters
    normalized = normalized.replace(/^([A-Ga-g][#b]?)\s*M$/, '$1maj');
    normalized = normalized.replace(/^([A-Ga-g][#b]?)\s*m$/, '$1min');
    
    // Remove spaces and lowercase
    return normalized
        .replace(/\s+/g, '')
        .toLowerCase();
}

/**
* Given a normalized key, return its enharmonic and relative equivalents.
*
* - "Enharmonic" keys name the same pitches differently (C♯maj ↔ D♭maj)
* - "Relative" keys share the same notes but different tonal centers
*   (e.g. C major ↔ A minor)
*
* @param key A normalized key string, e.g. "ebmin"
* @returns Array of normalized equivalent key tokens
*
* @example
* getEnharmonicEquivalents("ebmin") // ["f#maj","d#min"]
* getEnharmonicEquivalents("cmaj") // ["b#maj","amin"]
* getEnharmonicEquivalents("amin") // ["cmaj","b#maj"]
*/
export function getEnharmonicEquivalents(key: string): string[] {
    return ENHARMONIC_MAP[key] ?? [];
}
