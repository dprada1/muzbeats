import { describe, expect } from "vitest";
import { parseSearchQuery } from "../../utils/search/searchParser";
import keyCases from "../keys/key_test_cases.json";

interface KeyCase {
    input: string;
    expected: string | string[];
}

const cases = keyCases as KeyCase[];

describe("parseSearchQuery - key parsing", () => {
    cases.forEach(({ input, expected }) => {
        const expectedKeys = Array.isArray(expected) ? expected : [expected];

        test(`\"${input}\" → [${expectedKeys.join(", ")}]`, () => {
            const { keys } = parseSearchQuery(input);
            expect(keys).toEqual(expectedKeys);
        });
    });
});
