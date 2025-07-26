import type { Beat } from "../../types/Beat";
import type { SearchParams } from "./searchParser";
import { normalizeKeyNotation, getEnharmonicEquivalents } from "./keyUtils";

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
