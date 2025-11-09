import type { SearchParams } from "@/types/SearchParams";
import { normalizeAccidental, normalizeQuality } from "../keyUtils";

/**
 * Parses musical-key tokens out of the search query.
 *
 * Recognizes and consumes, in priority order:
 *  1) Spaced 3-word keys:        "C sharp minor"      → C#min  
 *  2) Compact key+acc+qual:      "C#minor", "AsharpM" → C#min  
 *  3) Spaced 2-word accidentals: "C sharp"            → C#maj, C#min  
 *  4) Spaced 2-word quality:     "C minor"            → Cmin  
 *  5) Compact accidental-only:   "C#", "Ab"           → C#maj, C#min  
 *  6) Compact quality-only:      "Cm", "Cmaj"         → Cmin, Cmaj  
 *  7) Single-letter root only:   "C"                  → Cmaj, Cmin  
 *
 * Marks consumed token indices in `used` and appends
 * normalized keys to `out.keys`.
 */
export function parseKeys(
    tokens: string[],
    usedIndices: Set<number>,
    output: SearchParams
): void {
    for (let i = 0; i < tokens.length; i++) {
        if (usedIndices.has(i)) continue;

        const one   = tokens[i];
        const two   = tokens[i + 1];
        const three = tokens[i + 2];
        const rootLetter = /^[A-Ga-g]$/.test(one) ? one.toUpperCase() : null;

        // 1) Spaced 3-word keys: "C sharp minor"
        if (
            rootLetter &&
            two !== undefined &&
            three !== undefined &&
            !usedIndices.has(i + 1) &&
            !usedIndices.has(i + 2)
        ) {
            const acc = normalizeAccidental(two);
            const qual = normalizeQuality(three);
            if (acc && qual) {
                output.keys.push(rootLetter + acc + qual);
                usedIndices.add(i).add(i + 1).add(i + 2);
                i += 2;
                continue;
            }
        }

        // 2) Compact root+accidental+quality: "C#min", "AsharpM"
        let match = one.match(
            /^([A-Ga-g])(#|♯|b|♭|sharp|flat)(major|maj|M|minor|min|m)$/i
        );
        if (match) {
            const [, r, rawAcc, rawQual] = match;
            const root = r.toUpperCase();
            const acc  = normalizeAccidental(rawAcc)!;
            const qual = normalizeQuality(rawQual)!;
            output.keys.push(root + acc + qual);
            usedIndices.add(i);
            continue;
        }

        // 3) Spaced 2-word accidental-only: "C sharp"
        if (
            rootLetter &&
            two !== undefined &&
            !usedIndices.has(i + 1)
        ) {
            const acc = normalizeAccidental(two);
            if (acc) {
                output.keys.push(rootLetter + acc + "maj", rootLetter + acc + "min");
                usedIndices.add(i).add(i + 1);
                i += 1;
                continue;
            }
        }

        // 4) Spaced 2-word quality-only: "C minor"
        if (
            rootLetter &&
            two !== undefined &&
            !usedIndices.has(i + 1)
        ) {
            const qual = normalizeQuality(two);
            // exclude single-letter M/m in spaced form
            if (qual && two.toLowerCase().length > 1) {
                output.keys.push(rootLetter + qual);
                usedIndices.add(i).add(i + 1);
                i += 1;
                continue;
            }
        }

        // 5) Compact accidental-only: "C#", "Ab", "Asharp"
        match = one.match(/^([A-Ga-g])(#|♯|b|♭|sharp|flat)$/i);
        if (match) {
            const root = match[1].toUpperCase();
            const acc  = normalizeAccidental(match[2])!;
            output.keys.push(root + acc + "maj", root + acc + "min");
            usedIndices.add(i);
            continue;
        }

        // 6) Compact quality-only: "Cm", "Cmaj", "Cmajor"
        match = one.match(/^([A-Ga-g])(major|maj|M|minor|min|m)$/i);
        if (match) {
            const root = match[1].toUpperCase();
            const qual = normalizeQuality(match[2])!;
            output.keys.push(root + qual);
            usedIndices.add(i);
            continue;
        }

        // 7) Single-letter root only: "C"
        if (rootLetter) {
            output.keys.push(rootLetter + "maj", rootLetter + "min");
            usedIndices.add(i);
            continue;
        }

        // fallthrough: not a key
    }
}
