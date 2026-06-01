import { Router } from 'express';
import { getAllEvents, getFeeSummary, getStats, introspectToken, registerValidator, revokeValidator } from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

router.get('/stats', requireRole('admin'), getStats);
router.get('/events', requireAuth, getAllEvents);
router.get('/fees', requireAuth, getFeeSummary);
router.post('/validators/register', requireRole('admin'), registerValidator);
router.post('/validators/revoke', requireRole('admin'), revokeValidator);

/**
 * POST /api/admin/introspect
 *
 * Validates a JWT and returns its payload metadata without exposing secrets.
 * Useful for admins to inspect token claims (subject, role, expiry).
 *
 * @body token {string} - JWT to introspect
 * @response 200 { success: true, data: { sub, role, iat, exp } }
 * @response 400 { success: false, error: string } - Missing token or invalid/expired JWT
 * @auth Bearer (admin role required)
 */
router.post('/introspect', requireRole('admin'), introspectToken);

export default router;
