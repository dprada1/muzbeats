import pool from '@/config/database.js';
import type { Beat } from '@/types/Beat.js';
import type { SearchParams } from '@/types/SearchParams.js';
import { buildSearchQuery } from '@/utils/searchQueryBuilder.js';
import { denormalizeKeyNotation } from '@/utils/keyUtils.js';
import { getR2Url } from '@/utils/r2.js';

interface BeatDbRow {
    id: string;
    title: string;
    key: string;
    bpm: number;
    price: string | number;
    audio_path: string;
    cover_path: string | null;
}

/**
 * Map database row to Beat type
 * Converts audio_path -> audio, cover_path -> cover
 * Transforms paths to R2 URLs if R2 is configured
 * Uses fallback image if cover_path is null/empty
 * Denormalizes the canonical key ("c#min") back to display form ("C♯ min")
*/
function mapDbRowToBeat(row: BeatDbRow): Beat {
    // Use fallback image if cover_path is null or empty
    const coverPath = row.cover_path || '/assets/images/skimask.png';
    
    return {
        id: row.id,
        title: row.title,
        key: denormalizeKeyNotation(row.key),
        bpm: row.bpm,
        price: typeof row.price === 'number' ? row.price : parseFloat(row.price),
        audio: getR2Url(row.audio_path),
        cover: getR2Url(coverPath),
    };
}

/**
 * Get beats from PostgreSQL, filtered by the given search criteria.
 * Empty search criteria (all empty arrays) returns every beat.
*/
export async function getBeats(searchParams: SearchParams): Promise<Beat[]> {
    try {
        const { whereClause, params } = buildSearchQuery(searchParams);
        const query =
            `SELECT id, title, key, bpm, price, audio_path, cover_path FROM beats ${whereClause} ORDER BY created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows.map(mapDbRowToBeat);
    } catch (error) {
        console.error('Error fetching beats from database:', error);
        throw new Error('Failed to fetch beats from database');
    }
}

/**
 * Get a single beat by ID from PostgreSQL
*/
export async function getBeatById(id: string): Promise<Beat | null> {
    try {
        const result = await pool.query(
            'SELECT id, title, key, bpm, price, audio_path, cover_path FROM beats WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return mapDbRowToBeat(result.rows[0]);
    } catch (error) {
        console.error('Error fetching beat by ID from database:', error);
        throw new Error('Failed to fetch beat from database');
    }
}
