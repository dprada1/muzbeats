import { parseKeys }         from "../search/parsers/parseKeys";
import { parseBpms }         from "../search/parsers/parseBPMs";
import { parseGeneralKeywords }  from "./parsers/parseGeneralKeywords";

export interface SearchParams {
    bpmRanges: [number, number][];
    bpmValues: number[];
    keys:      string[];
    queryTokens: string[];
}

/**
 * Parses a raw search query into structured search parameters.
 *
 * Supported inputs:
 *  - Keys:             e.g. "C#min", "C sharp minor", "A♭ major", "G"
 *  - BPM values:       e.g. "160", "160bpm", "bpm160", "160 bpm"
 *  - BPM ranges:       e.g. "150-170", "150-170bpm", "150-170 bpm"
 *  - General keywords: e.g. "carti", "bright"
 *
 * Returns a SearchParams object containing:
 *  - bpmValues:   number[]              // single BPMs
 *  - bpmRanges:   [number,number][]     // min–max BPM ranges
 *  - keys:        string[]              // normalized key tokens
 *  - queryTokens: string[]              // other lower-cased terms
 */
export function parseSearchQuery(raw: string): SearchParams {
    // Normalize and split on whitespace
    const tokens = raw
        .replace(/[^\w#♯♭\-]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const used = new Set<number>();
    const out: SearchParams = {
        bpmRanges:  [],
        bpmValues:  [],
        keys:       [],
        queryTokens: []
    };

    parseKeys(tokens, used, out);
    parseBpms(tokens, used, out);
    parseGeneralKeywords(tokens, used, out);

    return out;
}
