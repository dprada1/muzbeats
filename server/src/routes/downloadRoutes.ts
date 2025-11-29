import { Router } from 'express';
import { downloadBeatHandler } from '@/controllers/downloadController.js';

const router = Router();

// GET /api/downloads/:token
router.get('/:token', downloadBeatHandler);

export default router;

