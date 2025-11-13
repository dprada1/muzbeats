import { Request, Response } from 'express';
import { getAllBeats, getBeatById } from '@/services/beatsService.js';

/**
 * GET /api/beats
 * Get all beats
 */
export async function getAllBeatsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const beats = await getAllBeats();
    res.json(beats);
  } catch (error) {
    console.error('Error fetching all beats:', error);
    res.status(500).json({ error: 'Failed to fetch beats' });
  }
}

/**
 * GET /api/beats/:id
 * Get a single beat by ID
 */
export async function getBeatByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Beat ID is required' });
      return;
    }

    const beat = await getBeatById(id);
    
    if (!beat) {
      res.status(404).json({ error: 'Beat not found' });
      return;
    }

    res.json(beat);
  } catch (error) {
    console.error('Error fetching beat by ID:', error);
    res.status(500).json({ error: 'Failed to fetch beat' });
  }
}

