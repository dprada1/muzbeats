import type { SearchParams } from '../types/SearchParams.js';
import { normalizeKeyNotation, getEnharmonicEquivalents } from './keyUtils.js';

/**
 * Builds a SQL WHERE clause and parameters from search criteria
 * Returns the WHERE clause string and parameter values array
*/
export function buildSearchQuery(searchParams: SearchParams): {
    whereClause: string;
    params: any[];
} {
    const conditions: string[] = [];
    const params: any[] = [];
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

    // Key filtering (case-insensitive, supports partial matches + enharmonic equivalents)
    if (keys.length > 0) {
        const keyConditions: string[] = [];
        
        // Collect all keys to search for (including enharmonic equivalents)
        const allKeysToSearch = new Set<string>();
        
        for (const key of keys) {
            // Normalize the search key
            const normalizedKey = normalizeKeyNotation(key);
            allKeysToSearch.add(normalizedKey);
            
            // Add enharmonic equivalents
            const equivalents = getEnharmonicEquivalents(normalizedKey);
            equivalents.forEach(eq => allKeysToSearch.add(eq));
        }
        
        // Build SQL patterns for all keys (original + equivalents)
        for (const searchKey of allKeysToSearch) {
            const patterns: string[] = [];
            
            // Pattern 1: Exact match without space
            patterns.push(`LOWER(REPLACE(key, ' ', '')) = $${paramIndex}`);
            params.push(searchKey.toLowerCase());
            paramIndex++;
            
            // Pattern 2: Match with space (e.g., "c min" matches "C min")
            if (searchKey.includes('maj') || searchKey.includes('min')) {
                const withSpace = searchKey.replace(/([a-g][#b]?)(maj|min)/i, '$1 $2');
                // Replace # with ♯ for database matching (DB uses ♯ symbol)
                const withSpaceSharp = withSpace.replace(/#/g, '♯');
                patterns.push(`LOWER(key) LIKE $${paramIndex}`);
                params.push(`%${withSpaceSharp.toLowerCase()}%`);
                paramIndex++;
            }
            
            // Pattern 3: Match without space, handle both # and ♯
            const searchKeySharp = searchKey.replace(/#/g, '♯');
            patterns.push(`LOWER(REPLACE(key, ' ', '')) LIKE $${paramIndex}`);
            params.push(`%${searchKeySharp.toLowerCase()}%`);
            paramIndex++;
            
            // Pattern 4: Also try with # symbol (in case DB has both)
            patterns.push(`LOWER(REPLACE(REPLACE(key, ' ', ''), '♯', '#')) LIKE $${paramIndex}`);
            params.push(`%${searchKey.toLowerCase()}%`);
            paramIndex++;
            
            keyConditions.push(`(${patterns.join(' OR ')})`);
        }
        
        // All search keys (original + equivalents) should be OR'd together
        conditions.push(`(${keyConditions.join(' OR ')})`);
    }

    // Title/keyword search (searches in title)
    if (queryTokens.length > 0) {
        const titleConditions: string[] = [];
        for (const token of queryTokens) {
            titleConditions.push(`LOWER(title) LIKE $${paramIndex}`);
            params.push(`%${token.toLowerCase()}%`);
            paramIndex++;
        }
        // All tokens must match (AND condition)
        conditions.push(`(${titleConditions.join(' AND ')})`);
    }

    const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

    return { whereClause, params };
}
