import { describe, expect, test } from "vitest";
import {
    ACCIDENTAL_MAP,
    normalizeAccidental,
    normalizeQuality,
    normalizeKeyNotation,
    getEnharmonicEquivalents
} from "../utils/search/keyUtils";

describe("keyUtils", () => {

    describe("ACCIDENTAL_MAP", () => {
        test.each(Object.entries(ACCIDENTAL_MAP))(
            "%s should map to %s",
            (input, expected) => {
                expect(ACCIDENTAL_MAP[input]).toBe(expected);
            }
        );
    });

    describe("normalizeAccidental", () => {
        test.each([
            ["#",      "#"],
            ["♯",      "#"],
            ["sharp",  "#"],
            ["b",      "b"],
            ["♭",      "b"],
            ["flat",   "b"],
            ["X",      undefined],
        ])("normalizeAccidental(%s) → %s", (input, expected) => {
            expect(normalizeAccidental(input)).toBe(expected);
        });
    });

    describe("normalizeQuality", () => {
        test.each([
            ["M",      "maj"],
            ["maj",    "maj"],
            ["major",  "maj"],
            ["m",      "min"],
            ["min",    "min"],
            ["minor",  "min"],
            ["foo",    undefined],
        ])("normalizeQuality(%s) → %s", (input, expected) => {
            expect(normalizeQuality(input)).toBe(expected);
        });
    });

    describe("normalizeKeyNotation", () => {
        test.each([
            [" C♯ Min ",    "c#min"],
            ["E flat Major","ebmaj"],
            ["  G ♭  m  ",  "gbm"],
            [" A  B C ",    "abc"],  // whitespace removal
        ])("normalizeKeyNotation(%s) → %s", (input, expected) => {
            expect(normalizeKeyNotation(input)).toBe(expected);
        });
    });

    describe("getEnharmonicEquivalents", () => {
        test.each([
            ["cmaj",   ["b#maj","amin"]],
            ["b#maj",  ["cmaj","amin"]],
            ["amin",   ["cmaj","b#maj"]],
            ["dmin",   ["fmaj"]],
            ["unknown", []],
        ])("getEnharmonicEquivalents(%s) → %j", (input, expected) => {
            expect(getEnharmonicEquivalents(input)).toEqual(expected);
        });
    });

});
