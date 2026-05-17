import { Router } from 'express';
import { submitMilestoneEvidence, getPendingMilestones } from '../controllers/validatorController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/milestone', requireAuth, submitMilestoneEvidence);
router.get('/milestones/pending', requireAuth, getPendingMilestones);

export default router;
