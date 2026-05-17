import { Router } from 'express';
import { getChallenge, postToken } from '../controllers/authController';

const router = Router();

router.get('/challenge', getChallenge);
router.post('/token', postToken);

export default router;
