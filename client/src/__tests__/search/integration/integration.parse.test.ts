import { parseSearchQuery } from '@/utils/search/searchParser';

type Params = ReturnType<typeof parseSearchQuery>;

afterEach(() => {
    vitest.clearAllMocks();
});

interface Case {
    description: string;
    inputs: string[];
    //expected: Pick<Params, 'bpmValues' | 'bpmRanges' | 'keys' | 'queryTokens'>;
    expected: Params;
}

const cases: Case[] = [
    {
        description: 'compact range + key + two keywords (order-agnostic)',
        inputs: [
            '90-100 D#min chillwave funky',
            'funky 90-100 D#min chillwave',
            'chillwave D#min funky 90-100',
        ],
        expected: {
            bpmValues:    [],
            bpmRanges:    [[90, 100]],
            keys:         ['D#min'],
            queryTokens:  ['chillwave', 'funky'],
        },
    },
    {
        description: 'single BPM + key + single keyword',
        inputs: [
            '120 Cmaj sunset',
            'sunset 120 Cmaj',
            'Cmaj sunset 120',
        ],
        expected: {
            bpmValues:    [120],
            bpmRanges:    [],
            keys:         ['Cmaj'],
            queryTokens:  ['sunset'],
        },
    },
    {
        description: 'key + two keywords (no BPM)',
        inputs: [
            'Amin deep groove',
            'groove Amin deep',
        ],
        expected: {
            bpmValues:    [],
            bpmRanges:    [],
            keys:         ['Amin'],
            queryTokens:  ['deep', 'groove'],
        },
    },
    {
        description: 'two keywords only (no BPM, no key)',
        inputs: [
            'lofi jazz',
            'jazz lofi',
        ],
        expected: {
            bpmValues:    [],
            bpmRanges:    [],
            keys:         [],
            queryTokens:  ['lofi', 'jazz'],
        },
    },
    // --- BPM‑only variants ---
    {
        description: 'single BPM only',
        inputs: ['85'],
        expected: {
            bpmValues:    [85],
            bpmRanges:    [],
            keys:         [],
            queryTokens:  [],
        },
    },
    {
        description: 'range BPM only (with or without "bpm" token)',
        inputs: ['100-110', 'bpm 100-110'],
        expected: {
            bpmValues:    [],
            bpmRanges:    [[100, 110]],
            keys:         [],
            queryTokens:  [],
        },
    },
];

/**
 * Helper to assert equality while ignoring order of free‑form tokens
 */
function assertParams(actual: Params, expected: Case['expected']) {
    expect(actual.bpmValues).toEqual(expected.bpmValues);
    expect(actual.bpmRanges).toEqual(expected.bpmRanges);
    expect(actual.keys).toEqual(expected.keys);
    expect(actual.queryTokens.sort()).toEqual(expected.queryTokens.sort());
}


describe('parseSearchQuery integration: BPM + key + keywords', () => {
    cases.forEach(({ description, inputs, expected }) => {
        describe(description, () => {
            inputs.forEach(input => {
                it(`"${input}" → matches expected facets`, () => {
                    const params = parseSearchQuery(input);
                    assertParams(params, expected);
                });
            });
        });
    });
});
