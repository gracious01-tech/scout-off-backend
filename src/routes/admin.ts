import { Router } from 'express';
import { getStats, getAllEvents, getFeeSummary } from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/stats', requireRole('admin'), getStats);
router.get('/events', requireAuth, getAllEvents);
router.get('/fees', requireAuth, getFeeSummary);

export default router;
