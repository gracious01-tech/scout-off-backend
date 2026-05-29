import { Router } from 'express';
import { getAllEvents, getFeeSummary } from '../controllers/adminController';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/events', requireRole('admin'), getAllEvents);
router.get('/fees', requireRole('admin'), getFeeSummary);

export default router;
