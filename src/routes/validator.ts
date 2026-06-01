import { Router } from 'express';
import {
  submitMilestoneEvidence,
  getPendingMilestones,
  milestoneSchema,
  pendingQuerySchema,
} from '../controllers/validatorController';
import { requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';

const router = Router();

/**
 * POST /api/validators/milestone
 *
 * Pins milestone evidence to IPFS and returns the content identifier (CID).
 * The CID should be passed to the Soroban submit_milestone contract function.
 *
 * @body playerId {string} - Target player's on-chain identifier
 * @body milestoneType {string} - Type of milestone (e.g. "performance", "identity")
 * @body evidence {object} - Evidence metadata to pin to IPFS
 * @response 200 { success: true, data: { cid: string } }
 * @response 400 { success: false, error: string } - Validation failure
 * @response 401 { success: false, error: string } - Missing token
 * @response 403 { success: false, error: string } - Non-validator role
 * @auth Bearer (validator role required)
 */
router.post('/milestone', requireRole('validator'), validateBody(milestoneSchema), submitMilestoneEvidence);

/**
 * GET /api/validators/milestones/pending
 *
 * Returns a paginated list of milestones awaiting validator approval.
 *
 * @query playerId {string} - Filter by player ID (optional)
 * @query limit {number} - Maximum results to return (optional)
 * @response 200 { success: true, data: Milestone[] }
 * @response 401 { success: false, error: string } - Missing token
 * @response 403 { success: false, error: string } - Non-validator role
 * @auth Bearer (validator role required)
 */
router.get('/milestones/pending', requireRole('validator'), validateQuery(pendingQuerySchema), getPendingMilestones);

export default router;
