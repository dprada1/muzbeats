import { Request, Response } from 'express';
import { getBeats, getBeatById } from '@/services/beatsService.js';
import { getRouteParam } from '@/utils/routeParams.js';
import { parseSearchQuery } from '@/utils/searchParser.js';
import type { SearchParams } from '@/types/SearchParams.js';
import type { Beat } from '@/types/Beat.js';
import { isValidUUIDv4 } from '@/config/checkoutLimits.js';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/beats
 * Get all beats with optional search/filtering
 *
 * Query parameters:
 * - q: Raw search query string (e.g., "pierre 160 C#min")
 * - bpm: Exact BPM value (e.g., "160")
 * - bpmMin: Minimum BPM for range (e.g., "150")
 * - bpmMax: Maximum BPM for range (e.g., "170")
 * - key: Musical key (e.g., "C#min", "A maj")
 * - search: Keyword search in title (e.g., "pierre")
*/
export async function getBeatsHandler(req: Request, res: Response): Promise<void> {
    try {
        const { q, bpm, bpmMin, bpmMax, key, search } = req.query;

        let searchParams: SearchParams = {
            bpmRanges: [],
            bpmValues: [],
            keys: [],
            queryTokens: []
        };

        // If 'q' parameter is provided, parse it as a full search query
        if (q && typeof q === 'string') {
            searchParams = parseSearchQuery(q);
        }
        // Otherwise, build SearchParams from individual query parameters
        else if (bpm || bpmMin || bpmMax || key || search) {
            // BPM filtering
            if (bpm && typeof bpm === 'string') {
                const bpmValue = parseInt(bpm);
                if (!isNaN(bpmValue) && bpmValue > 0 && bpmValue < 300) {
                    searchParams.bpmValues.push(bpmValue);
                }
            }

            if (bpmMin && bpmMax && typeof bpmMin === 'string' && typeof bpmMax === 'string') {
                const min = parseInt(bpmMin);
                const max = parseInt(bpmMax);
                if (!isNaN(min) && !isNaN(max) && min > 0 && max > min && max < 300) {
                    searchParams.bpmRanges.push([min, max]);
                }
            }

            // Key filtering
            if (key && typeof key === 'string') {
                searchParams.keys.push(key);
            }

            // Keyword search
            if (search && typeof search === 'string') {
                // Split search into tokens
                const tokens = search.split(/\s+/).filter(Boolean);
                searchParams.queryTokens.push(...tokens);
            }
        }

        const beats: Beat[] = await getBeats(searchParams);
        logInfo(
            'beatsController.getBeatsHandler',
            'Beats requested',
            {
                ip: req.ip,
                count: beats.length,
                q: typeof q === 'string' ? q : undefined,
                bpm: typeof bpm === 'string' ? bpm : undefined,
                bpmMin: typeof bpmMin === 'string' ? bpmMin : undefined,
                bpmMax: typeof bpmMax === 'string' ? bpmMax : undefined,
                key: typeof key === 'string' ? key : undefined,
                search: typeof search === 'string' ? search : undefined,
            }
        );
        res.json(beats);
    } catch (error) {
        logError('beatsController.getBeatsHandler', 'Failed to fetch beats', error);
        res.status(500).json({ error: 'Failed to fetch beats' });
    }
}

/**
 * GET /api/beats/:id
 * Get a single beat by ID
*/
export async function getBeatByIdHandler(req: Request, res: Response): Promise<void> {
    try {
        const id = getRouteParam(req.params.id);

        if (!id) {
            res.status(400).json({ error: 'Beat ID is required' });
            return;
        }

        if (!isValidUUIDv4(id)) {
            res.status(400).json({ error: 'Beat ID must be a valid UUID' });
            return;
        }

        const beat: Beat | null = await getBeatById(id);
        
        if (!beat) {
            res.status(404).json({ error: 'Beat not found' });
            return;
        }

        logInfo(
            'beatsController.getBeatByIdHandler',
            'Beat requested',
            {
                ip: req.ip,
                beatId: id,
            }
        );
        res.json(beat);
    } catch (error) {
        logError('beatsController.getBeatByIdHandler', 'Failed to fetch beat by ID', error);
        res.status(500).json({ error: 'Failed to fetch beat' });
    }
}
