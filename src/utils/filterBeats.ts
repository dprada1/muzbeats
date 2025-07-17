import type { Beat } from "../types/Beat";
import type { SearchParams } from "./searchParser";

// Converts a musical key string into a normalized format.
// e.g. "C♯min" → "c#min" "E♭ Maj" → "ebmaj"
function normalizeKeyNotation(key: string): string {
    return key
        .replace(/\s+/g, "")
        .replace(/♯/g, "#")
        .replace(/♭/g, "b")
        .toLowerCase();
}

// Returns enharmonic and relative key equivalents for matching flexibility.
// Used to match user-entered keys like "C#min" to beats in "Dbmin", "Emaj", etc.
// e.g. getEnharmonicEquivalents("ebmin") → ["f#maj", "d#min"]
function getEnharmonicEquivalents(key: string): string[] {
    const map: Record<string, string[]> = {
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
    return map[key] || [];
}

/**
 * Filters a list of beats based on parsed search criteria.
 * Supports filtering by:
 * - Title or key text tokens (flexible keyword matching)
 * - Exact BPM values (e.g. "160")
 * - BPM ranges (e.g. "150-170")
 * - Key matches (including enharmonic and relative equivalents)
 * 
 * @param beats         The list of beat objects to filter
 * @param searchParams  The parsed search input from the user
 * @returns             A filtered list of beats matching the query
 */
export function filterBeats(beats: Beat[], searchParams: SearchParams): Beat[] {
    const { bpmValues, bpmRanges, keys, queryTokens } = searchParams;

    return beats.filter(beat => {
        const beatTitle = beat.title.toLowerCase();
        const beatKey = normalizeKeyNotation(beat.key);
        const searchableText = `${beatTitle} ${beatKey}`;

        // --- Token-based general matching (e.g. "bright pierre")
        if (queryTokens.length) {
            const allTokensMatch = queryTokens.every(token =>
                searchableText.includes(token)
            );
            if (!allTokensMatch) return false;
        }

        // --- BPM matching
        const matchesBpmValue = bpmValues.includes(beat.bpm);
        const matchesBpmRange = bpmRanges.some(
            ([min, max]) => beat.bpm >= min && beat.bpm <= max
        );

        const bpmFilteringActive = bpmValues.length > 0 || bpmRanges.length > 0;
        const bpmMatched = matchesBpmValue || matchesBpmRange;

        if (bpmFilteringActive && !bpmMatched) {
            return false;
        }

        // --- Key matching (enharmonic + relative equivalents)
        if (keys.length > 0) {
            const beatVariants = new Set([
                beatKey,
                ...getEnharmonicEquivalents(beatKey)
            ]);

            const searchVariants = keys.flatMap(k => {
                const norm = normalizeKeyNotation(k);
                return [norm, ...getEnharmonicEquivalents(norm)];
            });

            const matched = searchVariants.some(k => beatVariants.has(k));
            if (!matched) return false;
        }

        // All filters passed
        return true;
    });
}
