import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { buildChallenge, verifyAndIssueToken } from '../services/sep10';
import config from '../config';

const challengeSchema = z.object({ account: z.string().min(56).max(56) });
const tokenSchema = z.object({ transaction: z.string().min(1) });

/** GET /auth/challenge?account=G... */
export function getChallenge(req: Request, res: Response, next: NextFunction): void {
  try {
    const { account } = challengeSchema.parse(req.query);
    const transaction = buildChallenge(account);
    res.json({ transaction, networkPassphrase: config.networkPassphrase });
  } catch (err) {
    next(err);
  }
}

/** POST /auth/token  { transaction: "<signed XDR>" } */
export function postToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const { transaction } = tokenSchema.parse(req.body);
    const { token, account } = verifyAndIssueToken(transaction);
    res.json({ token, account, expiresIn: 86400 });
  } catch (err) {
    next(err);
  }
}
