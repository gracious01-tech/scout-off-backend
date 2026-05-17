import { Router } from 'express';
import {
  registerPlayer,
  getPlayer,
  filterPlayers,
  getPlayerMilestones,
} from '../controllers/playerController';

const router = Router();

router.get('/', filterPlayers);
router.post('/register', registerPlayer);
router.get('/:playerId', getPlayer);
router.get('/:playerId/milestones', getPlayerMilestones);

export default router;
