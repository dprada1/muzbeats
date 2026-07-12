import type { SearchParams } from '@/types/SearchParams.js';
import { normalizeKeyNotation, getEnharmonicEquivalents } from './keyUtils.js';

/**
 * Builds a SQL WHERE clause and parameters from search criteria
 * Returns the WHERE clause string and parameter values array
*/
export function buildSearchQuery(searchParams: SearchParams): {
    whereClause: string;
    params: unknown[];
} {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    const { bpmValues, bpmRanges, keys, queryTokens } = searchParams;

    // BPM filtering
    if (bpmValues.length > 0 || bpmRanges.length > 0) {
        const bpmConditions: string[] = [];

        // Exact BPM values
        if (bpmValues.length > 0) {
            bpmConditions.push(`bpm = ANY($${paramIndex}::int[])`);
            params.push(bpmValues);
            paramIndex++;
        }

        // BPM ranges
        for (const [min, max] of bpmRanges) {
            bpmConditions.push(`(bpm >= $${paramIndex} AND bpm <= $${paramIndex + 1})`);
            params.push(min, max);
            paramIndex += 2;
        }

        if (bpmConditions.length > 0) {
            conditions.push(`(${bpmConditions.join(' OR ')})`);
        }
    }

    // Key filtering: beats.key is stored in canonical normalized form (e.g. "c#min"),
    // so we match it directly against the normalized search keys plus their
    // enharmonic/relative equivalents. A row matches if its key is ANY of them.
    if (keys.length > 0) {
        const keysToMatch = new Set<string>();

        for (const key of keys) {
            const normalizedKey = normalizeKeyNotation(key);
            keysToMatch.add(normalizedKey);
            for (const equivalent of getEnharmonicEquivalents(normalizedKey)) {
                keysToMatch.add(equivalent);
            }
        }

        conditions.push(`key = ANY($${paramIndex}::text[])`);
        params.push([...keysToMatch]);
        paramIndex++;
    }

    // Title/keyword search: every token must appear in the title (AND semantics),
    // expressed as a single LIKE ALL against an array of patterns.
    if (queryTokens.length > 0) {
        const patterns = queryTokens.map((token) => `%${token.toLowerCase()}%`);
        conditions.push(`LOWER(title) LIKE ALL($${paramIndex}::text[])`);
        params.push(patterns);
        paramIndex++;
    }

    const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    return { whereClause, params };
}
