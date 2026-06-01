import { Router } from 'express';
import { getChallenge, postToken } from '../controllers/authController';

const router = Router();

/**
 * GET /auth/challenge
 *
 * Returns a SEP-10 challenge XDR for the given Stellar account.
 * The client must sign the transaction and submit it to /auth/token.
 *
 * @query account {string} - Stellar public key (G...)
 * @response 200 { challenge: string } - Base64-encoded XDR transaction
 * @response 400 { error: string } - Missing or invalid account parameter
 * @auth none
 */
router.get('/challenge', getChallenge);

/**
 * POST /auth/token
 *
 * Validates a signed SEP-10 XDR transaction and issues a JWT.
 * The JWT encodes the Stellar account address and an optional role.
 *
 * @body transaction {string} - Signed XDR transaction from /auth/challenge
 * @body role {string} - Optional role hint (player | scout | validator | admin)
 * @response 200 { token: string } - Signed JWT for use as Bearer token
 * @response 400 { error: string } - Missing or malformed transaction
 * @response 401 { error: string } - Signature verification failed
 * @auth none
 */
router.post('/token', postToken);

export default router;
