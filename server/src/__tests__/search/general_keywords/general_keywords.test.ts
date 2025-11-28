import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "@/utils/searchParser.js";
import generalKeywordCases from "./general_keywords_cases.json";

describe("parseSearchQuery - General keywords only", () => {
    generalKeywordCases.forEach(({ input, expected }) => {
        it(`should extract general keywords from "${input}"`, () => {
            const searchParamsResult = parseSearchQuery(input);
            expect(searchParamsResult.queryTokens.sort()).toEqual(expected.sort());
        });
    });
});
