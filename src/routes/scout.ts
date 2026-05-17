import { Router } from 'express';
import { getSubscription, getUnlockedContacts } from '../controllers/scoutController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:wallet/subscription', requireAuth, getSubscription);
router.get('/:wallet/contacts', requireAuth, getUnlockedContacts);

export default router;
