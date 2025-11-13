import { Router } from 'express';
import { getAllBeatsHandler, getBeatByIdHandler } from '@/controllers/beatsController.js';

const router = Router();

// GET /api/beats - Get all beats
router.get('/', getAllBeatsHandler);

// GET /api/beats/:id - Get single beat by ID
router.get('/:id', getBeatByIdHandler);

export default router;

