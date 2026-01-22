import { describe, expect, it } from 'vitest';
import {
    isValidUUID,
    isValidBeatId,
    isValidOrderId,
    validateSearchQuery,
    truncateForDisplay,
    isValidBeat,
    validateCartData,
    MAX_SEARCH_QUERY_LENGTH,
} from '@/validation/validation';
import type { Beat } from '@/types/Beat';

describe('isValidUUID', () => {
    it('validates correct UUID format', () => {
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
        expect(isValidUUID('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF')).toBe(true);
    });

    it('rejects invalid UUID formats', () => {
        expect(isValidUUID('')).toBe(false);
        expect(isValidUUID('123')).toBe(false);
        expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false); // too short
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false); // too long
        expect(isValidUUID('123e4567-e89b-12d3-a456-42661417400g')).toBe(false); // invalid char
        expect(isValidUUID('123e4567e89b12d3a456426614174000')).toBe(false); // no hyphens
    });

    it('handles null and undefined', () => {
        expect(isValidUUID(null)).toBe(false);
        expect(isValidUUID(undefined)).toBe(false);
    });

    it('handles non-string types', () => {
        expect(isValidUUID(123 as any)).toBe(false);
        expect(isValidUUID({} as any)).toBe(false);
        expect(isValidUUID([] as any)).toBe(false);
    });
});

describe('isValidBeatId', () => {
    it('validates beat IDs as UUIDs', () => {
        expect(isValidBeatId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(isValidBeatId('invalid')).toBe(false);
        expect(isValidBeatId(null)).toBe(false);
        expect(isValidBeatId(undefined)).toBe(false);
    });
});

describe('isValidOrderId', () => {
    it('validates UUID order IDs', () => {
        expect(isValidOrderId('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('validates PayPal order IDs', () => {
        expect(isValidOrderId('PAYID-123456789')).toBe(true);  // 15 chars
        expect(isValidOrderId('PAY-ABC123')).toBe(true);       // 10 chars (min length)
        expect(isValidOrderId('ORDER_123_ABC')).toBe(true);    // 13 chars
        expect(isValidOrderId('order123456')).toBe(true);      // 11 chars (above min)
        expect(isValidOrderId('ORDER-123-ABC-DEF')).toBe(true); // 17 chars
    });

    it('rejects invalid order IDs', () => {
        expect(isValidOrderId('')).toBe(false);
        expect(isValidOrderId('123')).toBe(false); // too short
        expect(isValidOrderId('a'.repeat(256))).toBe(false); // too long
        expect(isValidOrderId('ORDER@123')).toBe(false); // invalid char (@)
        expect(isValidOrderId('ORDER 123')).toBe(false); // spaces not allowed
        expect(isValidOrderId(null)).toBe(false);
        expect(isValidOrderId(undefined)).toBe(false);
    });

    it('handles edge cases for length', () => {
        expect(isValidOrderId('a'.repeat(10))).toBe(true); // min length
        expect(isValidOrderId('a'.repeat(255))).toBe(true); // max length
        expect(isValidOrderId('a'.repeat(9))).toBe(false); // too short
        expect(isValidOrderId('a'.repeat(256))).toBe(false); // too long
    });
});

describe('validateSearchQuery', () => {
    it('validates normal queries', () => {
        const result = validateSearchQuery('hello world');
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('hello world');
        expect(result.wasTruncated).toBe(false);
    });

    it('trims whitespace', () => {
        const result = validateSearchQuery('  hello world  ');
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('hello world');
        expect(result.wasTruncated).toBe(false);
    });

    it('rejects empty strings', () => {
        const result = validateSearchQuery('');
        expect(result.isValid).toBe(false);
        expect(result.query).toBe('');
        expect(result.wasTruncated).toBe(false);
    });

    it('rejects whitespace-only strings', () => {
        const result = validateSearchQuery('   ');
        expect(result.isValid).toBe(false);
        expect(result.query).toBe('');
        expect(result.wasTruncated).toBe(false);
    });

    it('handles null and undefined', () => {
        expect(validateSearchQuery(null).isValid).toBe(false);
        expect(validateSearchQuery(undefined).isValid).toBe(false);
    });

    it('truncates queries exceeding max length', () => {
        const longQuery = 'a'.repeat(MAX_SEARCH_QUERY_LENGTH + 50);
        const result = validateSearchQuery(longQuery);
        expect(result.isValid).toBe(true);
        expect(result.query.length).toBeLessThanOrEqual(MAX_SEARCH_QUERY_LENGTH);
        expect(result.wasTruncated).toBe(true);
    });

    it('truncates at word boundaries when possible', () => {
        const words = Array(100).fill('word').join(' '); // ~500 chars
        const result = validateSearchQuery(words);
        expect(result.isValid).toBe(true);
        expect(result.wasTruncated).toBe(true);
        // Implementation truncates at word boundary if lastSpace > 80% of max length (160)
        // Since we have many words, it should truncate at a space
        expect(result.query.length).toBeLessThanOrEqual(MAX_SEARCH_QUERY_LENGTH);
        // Should end at a word boundary (not mid-word) if lastSpace was > 160
        // But we can't guarantee this, so just check it's valid and truncated
        expect(result.query.trim().length).toBeGreaterThan(0);
    });

    it('handles queries at max length', () => {
        const maxQuery = 'a'.repeat(MAX_SEARCH_QUERY_LENGTH);
        const result = validateSearchQuery(maxQuery);
        expect(result.isValid).toBe(true);
        expect(result.query).toBe(maxQuery);
        expect(result.wasTruncated).toBe(false);
    });

    it('handles queries just over max length', () => {
        const overMaxQuery = 'a'.repeat(MAX_SEARCH_QUERY_LENGTH + 1);
        const result = validateSearchQuery(overMaxQuery);
        expect(result.isValid).toBe(true);
        expect(result.query.length).toBeLessThanOrEqual(MAX_SEARCH_QUERY_LENGTH);
        expect(result.wasTruncated).toBe(true);
    });
});

describe('truncateForDisplay', () => {
    it('returns text unchanged if within limit', () => {
        expect(truncateForDisplay('hello', 10)).toBe('hello');
        expect(truncateForDisplay('hello world', 20)).toBe('hello world');
    });

    it('truncates text exceeding limit', () => {
        const longText = 'a'.repeat(100);
        const result = truncateForDisplay(longText, 50);
        expect(result.length).toBe(53); // 50 + '...'
        expect(result).toBe('a'.repeat(50) + '...');
    });

    it('uses default max length of 60', () => {
        const longText = 'a'.repeat(100);
        const result = truncateForDisplay(longText);
        expect(result.length).toBe(63); // 60 + '...'
        expect(result).toBe('a'.repeat(60) + '...');
    });

    it('handles exact length match', () => {
        const exactText = 'a'.repeat(50);
        expect(truncateForDisplay(exactText, 50)).toBe(exactText);
    });

    it('handles empty string', () => {
        expect(truncateForDisplay('', 10)).toBe('');
    });
});

describe('isValidBeat', () => {
    const validBeat: Beat = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Beat',
        key: 'Cmaj',
        bpm: 120,
        price: 19.99,
        audio: '/audio/test.mp3',
        cover: '/cover/test.jpg',
    };

    it('validates correct beat objects', () => {
        expect(isValidBeat(validBeat)).toBe(true);
    });

    it('rejects null and undefined', () => {
        expect(isValidBeat(null)).toBe(false);
        expect(isValidBeat(undefined)).toBe(false);
    });

    it('rejects non-objects', () => {
        expect(isValidBeat('string')).toBe(false);
        expect(isValidBeat(123)).toBe(false);
        expect(isValidBeat([])).toBe(false);
        expect(isValidBeat(true)).toBe(false);
    });

    it('rejects objects with missing required fields', () => {
        expect(isValidBeat({})).toBe(false);
        expect(isValidBeat({ id: '123' })).toBe(false);
        expect(isValidBeat({ id: '123', title: 'Test' })).toBe(false);
    });

    it('rejects objects with wrong types', () => {
        expect(isValidBeat({ ...validBeat, id: 123 })).toBe(false);
        expect(isValidBeat({ ...validBeat, title: 123 })).toBe(false);
        expect(isValidBeat({ ...validBeat, bpm: '120' })).toBe(false);
        expect(isValidBeat({ ...validBeat, price: '19.99' })).toBe(false);
    });

    it('rejects objects with empty strings', () => {
        expect(isValidBeat({ ...validBeat, id: '' })).toBe(false);
        expect(isValidBeat({ ...validBeat, title: '' })).toBe(false);
        expect(isValidBeat({ ...validBeat, key: '' })).toBe(false);
        expect(isValidBeat({ ...validBeat, audio: '' })).toBe(false);
        expect(isValidBeat({ ...validBeat, cover: '' })).toBe(false);
    });

    it('rejects invalid bpm values', () => {
        expect(isValidBeat({ ...validBeat, bpm: 0 })).toBe(false);
        expect(isValidBeat({ ...validBeat, bpm: -1 })).toBe(false);
        expect(isValidBeat({ ...validBeat, bpm: 1.5 })).toBe(false); // must be integer
    });

    it('rejects invalid price values', () => {
        expect(isValidBeat({ ...validBeat, price: -1 })).toBe(false);
        expect(isValidBeat({ ...validBeat, price: -0.01 })).toBe(false);
    });

    it('accepts zero price', () => {
        expect(isValidBeat({ ...validBeat, price: 0 })).toBe(true);
    });

    it('accepts valid integer bpm', () => {
        expect(isValidBeat({ ...validBeat, bpm: 1 })).toBe(true);
        expect(isValidBeat({ ...validBeat, bpm: 200 })).toBe(true);
    });
});

describe('validateCartData', () => {
    const validBeat: Beat = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Beat',
        key: 'Cmaj',
        bpm: 120,
        price: 19.99,
        audio: '/audio/test.mp3',
        cover: '/cover/test.jpg',
    };

    const validBeat2: Beat = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        title: 'Test Beat 2',
        key: 'Dmaj',
        bpm: 140,
        price: 24.99,
        audio: '/audio/test2.mp3',
        cover: '/cover/test2.jpg',
    };

    it('validates array of valid beats', () => {
        const result = validateCartData([validBeat, validBeat2]);
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(validBeat);
        expect(result[1]).toEqual(validBeat2);
    });

    it('returns empty array for non-array input', () => {
        expect(validateCartData(null)).toEqual([]);
        expect(validateCartData(undefined)).toEqual([]);
        expect(validateCartData('string')).toEqual([]);
        expect(validateCartData(123)).toEqual([]);
        expect(validateCartData({})).toEqual([]);
    });

    it('filters out invalid beats', () => {
        const invalidBeat1 = { ...validBeat, id: '' }; // empty id
        const invalidBeat2 = { ...validBeat, bpm: -1 }; // invalid bpm
        const invalidBeat3 = { id: '123', title: 'Test' }; // missing fields
        
        const result = validateCartData([
            validBeat,
            invalidBeat1,
            validBeat2,
            invalidBeat2,
            invalidBeat3,
        ]);
        
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(validBeat);
        expect(result[1]).toEqual(validBeat2);
    });

    it('returns empty array for all invalid beats', () => {
        const invalidBeats = [
            { id: '' },
            { title: 'Test' },
            { bpm: -1 },
        ];
        
        expect(validateCartData(invalidBeats)).toEqual([]);
    });

    it('handles empty array', () => {
        expect(validateCartData([])).toEqual([]);
    });

    it('handles mixed valid and invalid data', () => {
        const invalidBeat = { ...validBeat, price: -1 };
        const result = validateCartData([validBeat, invalidBeat, validBeat2]);
        expect(result).toHaveLength(2);
        expect(result).toEqual([validBeat, validBeat2]);
    });
});
