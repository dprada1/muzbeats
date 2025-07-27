import { parseKeys } from "./parsers/parseKeys";
import { parseBPMs } from "./parsers/parseBPMs";
import { parseGeneralKeywords } from "./parsers/parseGeneralKeywords";

export interface SearchParams {
    bpmRanges:   [number, number][];
    bpmValues:   number[];
    keys:        string[];
    queryTokens: string[];
}

/**
 * Parses a raw search string into structured SearchParams.
 *
 * Supported tokens:
 *  - Keys     (e.g. "C#min", "A flat major", "G")
 *  - BPMs     (e.g. "160", "160bpm", "150-170", "150–170", "150—170")
 *  - Keywords (any other free text)
 *
 * Unicode en- and em-dashes are preserved so that the BPM parser
 * can treat them as range separators.
 */
export function parseSearchQuery(raw: string): SearchParams {
    // Split on any run of characters *except* letters, digits, underscore,
    // #, ♯, ♭, hyphen-minus, en-dash, em-dash, or dot
    const tokens = raw
        .replace(/[^\w#♯♭\-\u2013\u2014\.]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    const used = new Set<number>();
    const out: SearchParams = {
        bpmRanges:   [],
        bpmValues:   [],
        keys:        [],
        queryTokens: []
    };

    parseKeys(tokens, used, out);
    parseBPMs(tokens, used, out);
    parseGeneralKeywords(tokens, used, out);

    return out;
}
