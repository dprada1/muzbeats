import type { SearchParams } from "../searchParser";

/**
 * Parses BPM values and ranges from the search query.
 * 
 * Recognizes:
 *  1. Compact ranges: "150-170", "150-170bpm", "bpm150-170"
 *  2. Compact values: "160", "160bpm", "bpm160"
 *  3. Spaced values: "160 bpm"
 *  4. Spaced ranges: "150-170 bpm"
 * 
 * Marks consumed token indices in `used` and appends results
 * to `out.bpmValues` or `out.bpmRanges`.
 */
export function parseBpms(
    tokens: string[],
    used: Set<number>,
    out: SearchParams
): void {
    for (let i = 0; i < tokens.length; i++) {
        if (used.has(i)) continue;

        const one = tokens[i];
        const two = tokens[i + 1];

        // --- 1) BPM range compact: "150-170", "150-170bpm", "bpm150-170" ---
        if (/^(bpm)?\d{2,3}-\d{2,3}(bpm)?$/i.test(one)) {
            const [min, max] = one
                .replace(/bpm/gi, "")
                .split("-")
                .map((n) => Number(n));
            if (!isNaN(min) && !isNaN(max)) out.bpmRanges.push([min, max]);
            used.add(i);
            continue;
        }

        // --- 2) Single BPM compact: "160", "160bpm", "bpm160" ---
        if (/^(bpm)?\d{2,3}(bpm)?$/i.test(one)) {
            const bpm = parseInt(one.replace(/bpm/gi, ""), 10);
            if (!isNaN(bpm)) out.bpmValues.push(bpm);
            used.add(i);
            continue;
        }

        // --- 3) BPM value spaced: "160 bpm" ---
        if (/^\d{2,3}$/.test(one) && two?.toLowerCase() === "bpm") {
            const bpm = parseInt(one, 10);
            if (!isNaN(bpm)) out.bpmValues.push(bpm);
            used.add(i);
            used.add(i + 1);
            i += 2;
            continue;
        }

        // --- 4) BPM range spaced: "150-170 bpm" ---
        if (/^\d{2,3}-\d{2,3}$/.test(one) && two?.toLowerCase() === "bpm") {
            const [min, max] = one.split("-").map((n) => Number(n));
            if (!isNaN(min) && !isNaN(max)) out.bpmRanges.push([min, max]);
            used.add(i);
            used.add(i + 1);
            i += 2;
            continue;
        }

        // fall‐through if this token isn’t recognized as a BPM pattern
    }
}
