import pool from '@/config/database.js';
import type { Beat } from '@/types/Beat.js';
import type { SearchParams } from '@/types/SearchParams.js';
import { buildSearchQuery } from '@/utils/searchQueryBuilder.js';
import { getR2Url } from '@/utils/r2.js';

/**
 * Map database row to Beat type
 * Converts audio_path -> audio, cover_path -> cover
 * Transforms paths to R2 URLs if R2 is configured
 * Uses fallback image if cover_path is null/empty
*/
function mapDbRowToBeat(row: any): Beat {
    // Use fallback image if cover_path is null or empty
    const coverPath = row.cover_path || '/assets/images/skimask.png';
    
    return {
        id: row.id,
        title: row.title,
        key: row.key,
        bpm: row.bpm,
        price: parseFloat(row.price),
        audio: getR2Url(row.audio_path),
        cover: getR2Url(coverPath),
    };
}

/**
 * Get all beats from PostgreSQL with optional search/filtering
*/
export async function getAllBeats(searchParams?: SearchParams): Promise<Beat[]> {
    try {
        let query = 'SELECT id, title, key, bpm, price, audio_path, cover_path FROM beats';
        let params: any[] = [];

        // Apply search filters if provided
        if (searchParams) {
            const { whereClause, params: queryParams } = buildSearchQuery(searchParams);
            query += ` ${whereClause}`;
            params = queryParams;
        }

        // Always order by created_at DESC
        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);
        return result.rows.map(mapDbRowToBeat);
    } catch (error) {
        console.error('Error fetching all beats from database:', error);
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
