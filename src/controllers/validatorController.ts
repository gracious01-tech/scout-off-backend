import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pinJson } from '../services/ipfs';
import { getEvents } from '../services/indexer';

const milestoneSchema = z.object({
  playerId: z.string().min(1),
  milestoneType: z.enum(['identity', 'performance', 'trial_offer']),
  evidence: z.record(z.unknown()),
});

/** POST /api/validators/milestone */
export async function submitMilestoneEvidence(req: Request, res: Response, next: NextFunction) {
  try {
    const { playerId, milestoneType, evidence } = milestoneSchema.parse(req.body);
    const cid = await pinJson({ playerId, milestoneType, ...evidence });
    res.status(201).json({ success: true, data: { evidenceUri: cid } });
  } catch (err) {
    next(err);
  }
}

/** GET /api/validators/milestones/pending */
export async function getPendingMilestones(req: Request, res: Response, next: NextFunction) {
  try {
    const submitted = getEvents('milestone_submitted').map((e) => e.payload);
    const approvedIds = new Set(
      getEvents('milestone_approved').map((e) => e.payload.milestone_id)
    );
    const pending = submitted.filter((m) => !approvedIds.has(m.milestone_id));
    res.json({ success: true, data: pending });
  } catch (err) {
    next(err);
  }
}
