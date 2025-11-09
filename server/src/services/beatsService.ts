import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Beat } from '../types/Beat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to data.json
const DATA_FILE_PATH = path.join(__dirname, '../../public/assets/data.json');

// Cache for beats data (loaded once on first request)
let beatsCache: Beat[] | null = null;

/**
 * Load beats from data.json file
 * Uses caching to avoid reading file on every request
 */
async function loadBeats(): Promise<Beat[]> {
  if (beatsCache !== null) {
    return beatsCache;
  }

  try {
    const fileContent = await readFile(DATA_FILE_PATH, 'utf-8');
    const beats: Beat[] = JSON.parse(fileContent);
    beatsCache = beats;
    return beats;
  } catch (error) {
    console.error('Error loading beats:', error);
    throw new Error('Failed to load beats data');
  }
}

/**
 * Get all beats
 */
export async function getAllBeats(): Promise<Beat[]> {
  return loadBeats();
}

/**
 * Get a single beat by ID
 */
export async function getBeatById(id: string): Promise<Beat | null> {
  const beats = await loadBeats();
  return beats.find(beat => beat.id === id) || null;
}

/**
 * Clear the beats cache (useful for development/testing)
 */
export function clearBeatsCache(): void {
  beatsCache = null;
}

