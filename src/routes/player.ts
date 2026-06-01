import { Router } from 'express';
import {
  registerPlayer,
  getPlayer,
  filterPlayers,
  getPlayerMilestones,
  registerSchema,
  filterSchema,
} from '../controllers/playerController';
import { validateBody, validateQuery } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

router.get('/', rateLimit, validateQuery(filterSchema), filterPlayers);
router.post('/register', validateBody(registerSchema), registerPlayer);
router.get('/:playerId', getPlayer);
router.get('/:playerId/milestones', getPlayerMilestones);

export default router;
