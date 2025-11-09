import type { Beat } from "@/types/Beat";
import type { SearchParams } from "@/types/SearchParams";
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
        // --- Prepare searchable text: title, key, and optional tags, sanitized
        const sanitizedTitle = beat.title
            .toLowerCase()
            .replace(/[-–—]/g, ""); // remove hyphens and unicode dashes
    
        const sanitizedKey = normalizeKeyNotation(beat.key)
            .toLowerCase();
    
        // include tags if present at runtime (mock data)
        const beatTags: string[] = (beat as any).tags ?? [];
        const sanitizedTags = beatTags.map(tag => tag.toLowerCase());
    
        const searchableText = [sanitizedTitle, sanitizedKey, ...sanitizedTags].join(" ");
    
        // --- General keyword matching
        if (queryTokens.length) {
            const allTokensMatch = queryTokens.every(token =>
            searchableText.includes(token.toLowerCase())
            );
            if (!allTokensMatch) return false;
        }
    
        // --- BPM matching
        const matchesBpmValue = bpmValues.includes(beat.bpm);
        const matchesBpmRange = bpmRanges.some(
            ([min, max]) => beat.bpm >= min && beat.bpm <= max
        );
        const bpmFilteringActive = bpmValues.length > 0 || bpmRanges.length > 0;
        if (bpmFilteringActive && !(matchesBpmValue || matchesBpmRange)) {
            return false;
        }
    
        // --- Key matching (enharmonic + relative equivalents)
        if (keys.length > 0) {
            const beatVariants = new Set<string>([
            sanitizedKey,
            ...getEnharmonicEquivalents(sanitizedKey)
            ]);
    
            const searchVariants = keys.flatMap(k => {
            const norm = normalizeKeyNotation(k).toLowerCase();
            return [norm, ...getEnharmonicEquivalents(norm)];
            });
    
            const keyMatched = searchVariants.some(k => beatVariants.has(k));
            if (!keyMatched) return false;
        }
    
        // all criteria passed
        return true;
    });
  }
