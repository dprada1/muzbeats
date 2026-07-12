import { Router } from 'express';
import { getBeatsHandler, getBeatByIdHandler } from '@/controllers/beatsController.js';

const router = Router();

// GET /api/beats - Get all beats
router.get('/', getBeatsHandler);

// GET /api/beats/:id - Get single beat by ID
router.get('/:id', getBeatByIdHandler);

export default router;
