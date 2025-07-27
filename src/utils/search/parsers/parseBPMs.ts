import type { SearchParams } from "../searchParser";

/** Minimum allowed BPM (inclusive). */
const MIN_BPM = 40;
/** Maximum allowed BPM (inclusive). */
const MAX_BPM = 200;

/**
 * Returns true if `bpm` is an integer between MIN_BPM and MAX_BPM.
 */
function isValidBPM(bpm: number): boolean {
    return Number.isInteger(bpm) && bpm >= MIN_BPM && bpm <= MAX_BPM;
}

/** Numeric token: 10–999 with optional “.0” (no leading zeros). */
const NUM_RE = "[1-9]\\d{1,2}(?:\\.0+)?";
/** Range separator: ASCII hyphen-minus, en-dash (U+2013), or em-dash (U+2014). */
const RANGE_SEP = "[-\u2013\u2014]";
/** Matches compact range: e.g. “150-170”, “bpm150–170bpm”. */
const COMPACT_RANGE_RE = new RegExp(
    `^(?:bpm)?(${NUM_RE})${RANGE_SEP}(${NUM_RE})(?:bpm)?$`,
    "i"
);
/** Matches compact single BPM: e.g. “160”, “160bpm”, “bpm160”, “160.0”. */
const COMPACT_VAL_RE = new RegExp(`^(?:bpm)?(${NUM_RE})(?:bpm)?$`, "i");
/** Matches a standalone numeric token: no “bpm” or dashes. */
const SPACED_NUM_RE = new RegExp(`^${NUM_RE}$`);
/** Matches a standalone dash token: ASCII or Unicode. */
const SPACED_SEP_RE = new RegExp(`^${RANGE_SEP}$`);

/**
 * Parses BPM values and ranges from the token list.
 *
 * - Recognizes compact and spaced ranges using hyphens or Unicode dashes.
 * - Recognizes compact and spaced single values (integer or “.0” decimals).
 * - Discards reversed ranges, decimals ≠ .0, leading zeros, out-of-range.
 * - Treats “130-130” as single value; captures multiple occurrences.
 */
export function parseBPMs(
    tokens: string[],
    used: Set<number>,
    out: SearchParams
): void {
    for (let i = 0; i < tokens.length; i++) {
        if (used.has(i)) continue;
        const one = tokens[i],
              two = tokens[i + 1],
              three = tokens[i + 2],
              four = tokens[i + 3];

        // 1) Compact range
        const cr = one.match(COMPACT_RANGE_RE);
        if (cr) {
            const min = parseFloat(cr[1]),
                  max = parseFloat(cr[2]);
            if (min === max && isValidBPM(min)) {
                out.bpmValues.push(min);
            } else if (min < max && isValidBPM(min) && isValidBPM(max)) {
                out.bpmRanges.push([min, max]);
            }
            used.add(i);
            continue;
        }

        // 2) Spaced range: “150 - 170” or “150 – 170” etc.
        if (
            SPACED_NUM_RE.test(one) &&
            SPACED_SEP_RE.test(two) &&
            SPACED_NUM_RE.test(three)
        ) {
            const min = parseFloat(one),
                  max = parseFloat(three);
            if (min === max && isValidBPM(min)) {
                out.bpmValues.push(min);
            } else if (min < max && isValidBPM(min) && isValidBPM(max)) {
                out.bpmRanges.push([min, max]);
            }
            used.add(i).add(i + 1).add(i + 2);
            if (four?.toLowerCase() === "bpm") {
                used.add(i + 3);
                i += 3;
            } else {
                i += 2;
            }
            continue;
        }

        // 3) Compact single value
        const cv = one.match(COMPACT_VAL_RE);
        if (cv) {
            const val = parseFloat(cv[1]);
            if (isValidBPM(val)) {
                out.bpmValues.push(val);
            }
            used.add(i);
            continue;
        }

        // 4) Spaced single value: “160 bpm”
        if (SPACED_NUM_RE.test(one) && two?.toLowerCase() === "bpm") {
            const val = parseFloat(one);
            if (isValidBPM(val)) {
                out.bpmValues.push(val);
            }
            used.add(i).add(i + 1);
            i += 1;
            continue;
        }

        // skip other tokens
    }
}
