import { describe, expect, test, vi } from "vitest";
import { parseSearchQuery } from "@/utils/searchParser.js";

interface BpmCase {
    input:     string;
    bpmValues: number[];
    bpmRanges: [number, number][];
}

// Clear Vitest's module cache before loading the JSON
vi.resetModules();

// Synchronously require the JSON so it's fresh on each run
const bpmCases: BpmCase[] = require("./bpm_test_cases.json");

describe("parseSearchQuery - BPM parsing", () => {
    bpmCases.forEach(({ input, bpmValues, bpmRanges }) => {
        test(`"${input}" → values=[${bpmValues}] ranges=[${bpmRanges.map(
            ([min, max]) => `${min}-${max}`
        )}]`, () => {
        const { bpmValues: vals, bpmRanges: rngs } = parseSearchQuery(input);
        expect(vals).toEqual(bpmValues);
        expect(rngs).toEqual(bpmRanges);
        });
    });
});

