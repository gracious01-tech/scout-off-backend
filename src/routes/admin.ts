import { Router } from 'express';
import { getAllEvents, getFeeSummary } from '../controllers/adminController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/events', requireAuth, getAllEvents);
router.get('/fees', requireAuth, getFeeSummary);

export default router;
