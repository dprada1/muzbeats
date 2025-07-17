export interface SearchParams {
    bpmRanges: [number, number][];
    bpmValues: number[];
    keys: string[];
    queryTokens: string[];
}

// Maps accidentals from text or symbols to canonical "#" and "b"
const accidentalMap: Record<string, string> = {
    "sharp": "#",
    "♯": "#",
    "flat": "b",
    "♭": "b"
};

/**
 * Parses a search query string and extracts musical search criteria.
 *
 * Supported inputs:
 * - Keys (e.g. "C#min", "C sharp minor", "A♭ major", "G")
 * - BPM values (e.g. "160", "160bpm", "bpm160", "160 bpm")
 * - BPM ranges (e.g. "150-170", "150-170bpm", "150-170 bpm")
 * - General keywords (e.g. "carti", "bright")
 *
 * Returns a structured SearchParams object:
 * - bpmValues: [160]
 * - bpmRanges: [[150, 170]]
 * - keys: ["C#min", "Dbmaj"]
 * - queryTokens: ["carti", "bright"]
 */
export function parseSearchQuery(query: string): SearchParams {
    const tokens = query
        .replace(/[^\w#♯♭\-]+/g, " ") // remove punctuation but keep musical symbols
        .split(/\s+/)
        .filter(Boolean); // remove empty strings

    const searchParams: SearchParams = {
        bpmRanges: [],
        bpmValues: [],
        keys: [],
        queryTokens: []
    };

    // Track which token indexes have already been used for key/BPM parsing
    const used = new Set<number>();

    for (let i = 0; i < tokens.length; i++) {
        if (used.has(i)) continue;

        const one = tokens[i];
        const two = tokens[i + 1];
        const three = tokens[i + 2];

        // --- Match 3-word keys: "C sharp minor"
        if (
            three !== undefined &&
            !used.has(i) &&
            !used.has(i + 1) &&
            !used.has(i + 2)
        ) {
            const root = one.toUpperCase();
            const accidental = accidentalMap[two.toLowerCase()] || "";
            const qualityWord = three;
            const quality =
                ["min", "minor", "m"].includes(qualityWord.toLowerCase()) ? "min" :
                ["maj", "major", "M"].includes(qualityWord) ? "maj" : "";

            if (/^[A-G]$/.test(root) && quality) {
                searchParams.keys.push(root + accidental + quality);
                used.add(i);
                used.add(i + 1);
                used.add(i + 2);
                i += 3;
                continue;
            }
        }

        // --- Match 2-word keys: "C minor"
        if (
            two !== undefined &&
            !used.has(i) &&
            !used.has(i + 1)
        ) {
            const root = one.toUpperCase();
            const qualityWord = two;
            const quality =
                ["min", "minor", "m"].includes(qualityWord.toLowerCase()) ? "min" :
                ["maj", "major", "M"].includes(qualityWord) ? "maj" : "";

            if (/^[A-G]$/.test(root) && quality) {
                searchParams.keys.push(root + quality);
                used.add(i);
                used.add(i + 1);
                i += 2;
                continue;
            }
        }

        // --- Match compact keys like: "C#min", "Dflatmaj", "BbM"
        const compactKeyMatch = one.match(/^([A-Ga-g])(sharp|flat|[#b♯♭]?)(maj|minor|min|major|m|M)?$/);
        if (compactKeyMatch && !used.has(i)) {
            const [, rootRaw, accidentalRaw, qualityRaw] = compactKeyMatch;
            const root = rootRaw.toUpperCase();
            const accidental = accidentalMap[accidentalRaw] || accidentalRaw || "";

            let quality = "";
            if (!qualityRaw) {
                // No quality specified — assume both major and minor
                searchParams.keys.push(root + accidental + "maj");
                searchParams.keys.push(root + accidental + "min");
            } else {
                const q = qualityRaw.toLowerCase();
                if (["min", "minor", "m"].includes(q)) quality = "min";
                if (["maj", "major", "M"].includes(qualityRaw)) quality = "maj";

                if (quality) {
                    searchParams.keys.push(root + accidental + quality);
                }
            }

            used.add(i);
            continue;
        }

        // --- Match BPM ranges like: "150-170", "150-170bpm", "bpm150-170"
        if (/^(bpm)?\d{2,3}-\d{2,3}(bpm)?$/i.test(one)) {
            const [min, max] = one.replace(/bpm/gi, "").split("-").map(Number);
            if (!isNaN(min) && !isNaN(max)) {
                searchParams.bpmRanges.push([min, max]);
            }
            used.add(i);
            continue;
        }

        // --- Match single BPM values like: "160", "160bpm", "bpm160"
        if (/^(bpm)?\d{2,3}(bpm)?$/i.test(one)) {
            const bpm = parseInt(one.replace(/bpm/gi, ""));
            if (!isNaN(bpm)) {
                searchParams.bpmValues.push(bpm);
            }
            used.add(i);
            continue;
        }

        // --- Match BPM values like "160 bpm" (space-separated form)
        if (
            /^\d{2,3}$/.test(one) &&
            two?.toLowerCase() === "bpm"
        ) {
            const bpm = parseInt(one);
            if (!isNaN(bpm)) {
                searchParams.bpmValues.push(bpm);
            }
            used.add(i);
            used.add(i + 1);
            i += 2;
            continue;
        }

        // --- Match BPM ranges like "150-160 bpm" (space-separated form)
        if (
            /^\d{2,3}-\d{2,3}$/.test(one) &&
            two?.toLowerCase() === "bpm"
        ) {
            const [min, max] = one.split("-").map(Number);
            if (!isNaN(min) && !isNaN(max)) {
                searchParams.bpmRanges.push([min, max]);
            }
            used.add(i);
            used.add(i + 1);
            i += 2;
            continue;
        }

        // --- Default: treat as general search keyword (e.g., for beat titles)
        searchParams.queryTokens.push(one.toLowerCase());
        used.add(i);
    }

    return searchParams;
}
