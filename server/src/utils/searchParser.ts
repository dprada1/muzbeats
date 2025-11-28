/**
 * Simple search parser for backend
 * Parses query string into SearchParams
 *
 * Supports:
 * - BPM: "160", "160bpm", "150-170"
 * - Keys: "C#min", "A flat major", "G"
 * - Keywords: any other text (searches in title)
*/

import type { SearchParams } from '../types/SearchParams.js';

/**
 * Parse a raw search query string into SearchParams
 * This is a simplified version - for full parsing, you might want to
 * port the frontend parser or use a shared library
*/
export function parseSearchQuery(rawQuery: string): SearchParams {
    if (!rawQuery || rawQuery.trim() === '') {
        return {
            bpmRanges: [],
            bpmValues: [],
            keys: [],
            queryTokens: []
        };
    }

    const output: SearchParams = {
        bpmRanges: [],
        bpmValues: [],
        keys: [],
        queryTokens: []
    };

    // Split into tokens
    const tokens = rawQuery
        .replace(/[^\w#♯♭\-\u2013\u2014\.]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const usedIndices = new Set<number>();

    // Parse BPMs
    for (let i = 0; i < tokens.length; i++) {
        if (usedIndices.has(i)) continue;

        const token = tokens[i];
        
        // BPM range: "150-170" or "150–170" or "150—170"
        const rangeMatch = token.match(/^(\d+)[\-\u2013\u2014](\d+)$/);
        if (rangeMatch) {
            const min = parseInt(rangeMatch[1]);
            const max = parseInt(rangeMatch[2]);
            if (min > 0 && max > min && max < 300) {
                output.bpmRanges.push([min, max]);
                usedIndices.add(i);
                continue;
            }
        }

        // Single BPM: "160" or "160bpm"
        const bpmMatch = token.match(/^(\d+)(?:bpm)?$/i);
        if (bpmMatch) {
            const bpm = parseInt(bpmMatch[1]);
            if (bpm > 0 && bpm < 300) {
                output.bpmValues.push(bpm);
                usedIndices.add(i);
                continue;
            }
        }
    }

    // Parse keys (simplified - looks for common key patterns)
    // Patterns: "Cm", "Cmin", "C minor", "C#m", "C#min", "C# minor", etc.
    const keyPatterns = [
        /^[A-G][#♯b♭]?(?:maj|min|major|minor|m|M)$/i,  // "Cm", "Cmin", "CM", "C#m"
        /^[A-G][#♯b♭]?\s+(?:maj|min|major|minor)$/i,    // "C min", "C# maj"
        /^[A-G][#♯b♭]?\s+(?:sharp|flat)\s+(?:maj|min|major|minor)$/i  // "C sharp minor"
    ];

    for (let i = 0; i < tokens.length; i++) {
        if (usedIndices.has(i)) continue;

        const token = tokens[i];
        const nextToken = tokens[i + 1];
        const nextNextToken = tokens[i + 2];

        // Check single token key (e.g., "Cm", "Cmin", "C#m")
        if (keyPatterns[0].test(token)) {
            output.keys.push(normalizeKey(token));
            usedIndices.add(i);
            continue;
        }

        // Check two-token key (e.g., "C min", "C# maj")
        if (nextToken && keyPatterns[1].test(`${token} ${nextToken}`)) {
            output.keys.push(normalizeKey(`${token} ${nextToken}`));
            usedIndices.add(i);
            usedIndices.add(i + 1);
            i++; // Skip next token
            continue;
        }

        // Check three-token key (e.g., "C sharp minor")
        if (nextToken && nextNextToken && keyPatterns[2].test(`${token} ${nextToken} ${nextNextToken}`)) {
            output.keys.push(normalizeKey(`${token} ${nextToken} ${nextNextToken}`));
            usedIndices.add(i);
            usedIndices.add(i + 1);
            usedIndices.add(i + 2);
            i += 2; // Skip next two tokens
            continue;
        }
    }

    // Remaining tokens are keywords
    for (let i = 0; i < tokens.length; i++) {
        if (!usedIndices.has(i)) {
            output.queryTokens.push(tokens[i]);
        }
    }

    return output;
}

/**
 * Normalize key notation for search
 * Handles: "Cm" -> "cmin", "CM" -> "cmaj", "C min" -> "cmin", etc.
*/
function normalizeKey(key: string): string {
    // First normalize accidentals and full words
    let normalized = key
        .replace(/♯|sharp/gi, '#')
        .replace(/♭|flat/gi, 'b')
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
