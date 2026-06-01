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

const router = Router();

/**
 * GET /api/players
 *
 * Returns a filtered list of player profiles.
 * Supports optional query parameters for discovery.
 *
 * @query region {string} - Filter by player region (optional)
 * @query position {string} - Filter by playing position (optional)
 * @query minTier {number} - Minimum verified progress tier 0–3 (optional)
 * @response 200 { success: true, data: Player[] }
 * @auth none
 */
router.get('/', validateQuery(filterSchema), filterPlayers);

/**
 * POST /api/players/register
 *
 * Pins player metadata to IPFS via Pinata and returns the content identifier (CID).
 * The CID should be passed to the Soroban register_player contract function.
 *
 * @body position {string} - Playing position
 * @body region {string} - Player's region
 * @body metadata {object} - Additional profile metadata
 * @response 200 { success: true, data: { cid: string } }
 * @response 400 { success: false, error: string } - Validation failure
 * @auth none
 */
router.post('/register', validateBody(registerSchema), registerPlayer);

/**
 * GET /api/players/:playerId
 *
 * Returns a single player profile by their on-chain player ID.
 *
 * @param playerId {string} - On-chain player identifier
 * @response 200 { success: true, data: Player }
 * @response 404 { success: false, error: string } - Player not found
 * @auth none
 */
router.get('/:playerId', getPlayer);

/**
 * GET /api/players/:playerId/milestones
 *
 * Returns the tamper-proof milestone history for a player.
 *
 * @param playerId {string} - On-chain player identifier
 * @response 200 { success: true, data: Milestone[] }
 * @response 404 { success: false, error: string } - Player not found
 * @auth none
 */
router.get('/:playerId/milestones', getPlayerMilestones);

export default router;
