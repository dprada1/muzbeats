import pool from '@/config/database.js';
import type { Beat } from '@/types/Beat.js';

/**
 * Map database row to Beat type
 * Converts audio_path -> audio, cover_path -> cover
 */
function mapDbRowToBeat(row: any): Beat {
  return {
    id: row.id,
    title: row.title,
    key: row.key,
    bpm: row.bpm,
    price: parseFloat(row.price),
    audio: row.audio_path,
    cover: row.cover_path,
  };
}

/**
 * Get all beats from PostgreSQL
 */
export async function getAllBeats(): Promise<Beat[]> {
  try {
    const result = await pool.query(
      'SELECT id, title, key, bpm, price, audio_path, cover_path FROM beats ORDER BY created_at DESC'
    );
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
