import type { SearchParams } from "../searchParser";

/**
 * Parses any tokens not already consumed by other parsers
 * and treats them as general-keyword search terms.
 * 
 * Marks each un-used token index as consumed and pushes
 * the lower-cased token into `out.queryTokens`.
 */
export function parseGeneralKeywords(
    tokens: string[],
    usedIndices: Set<number>,
    out: SearchParams
): void {
    tokens.forEach((token, index) => {
        if (usedIndices.has(index)) return;
        out.queryTokens.push(token.toLowerCase());
        /*
        if (!usedIndices.has(index)) {
            out.queryTokens.push(token.toLowerCase());
        }
        */
    });
}
