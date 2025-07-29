import { filterBeats } from '../../utils/search/filterBeats';
import type { SearchParams } from '../../utils/search/searchParser';
import mockBeats from '../shared/mockBeats.json';
import type { Beat } from '../../types/Beat';

type TestCase = {
    params: SearchParams;
    expectedIds: string[];
};

// Define test cases mirroring previous scenarios, but with explicit SearchParams
const testCases: TestCase[] = [
    // Single-criterion
    { params: { bpmRanges: [], bpmValues: [],     keys: ['D#min'], queryTokens: [] },        expectedIds: ['mock-001'] },
    { params: { bpmRanges: [], bpmValues: [160],  keys: [],        queryTokens: [] },        expectedIds: ['mock-002'] },
    { params: { bpmRanges: [], bpmValues: [],     keys: [],        queryTokens: ['lofi'] },   expectedIds: ['mock-003'] },

    // Two-criterion
    { params: { bpmRanges: [], bpmValues: [],     keys: ['Amin'], queryTokens: ['808'] },   expectedIds: ['mock-004'] },
    { params: { bpmRanges: [], bpmValues: [105],  keys: ['Gmin'], queryTokens: [] },        expectedIds: ['mock-005'] },
    { params: { bpmRanges: [], bpmValues: [],     keys: ['Bmaj'], queryTokens: ['hyperpop'] }, expectedIds: ['mock-006'] },
    { params: { bpmRanges: [], bpmValues: [],     keys: ['Emin'], queryTokens: ['void'] },  expectedIds: ['mock-007'] },

    // Three-criterion
    { params: { bpmRanges: [], bpmValues: [85],   keys: ['Cmaj'], queryTokens: ['afternoon'] },    expectedIds: ['mock-003'] },
    { params: { bpmRanges: [], bpmValues: [120],  keys: ['D#min'],queryTokens: ['space'] },  expectedIds: ['mock-001'] },
];

describe('filterBeats unit tests (pure SearchParams)', () => {
    testCases.forEach(({ params, expectedIds }) => {
        it(`SearchParams ${JSON.stringify(params)} → [${expectedIds.join(', ')}]`, () => {
            const resultIds = filterBeats(mockBeats as Beat[], params).map(b => b.id);
            expect(resultIds.sort()).toEqual(expectedIds.sort());
        });
    });
});
