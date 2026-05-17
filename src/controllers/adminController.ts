import { Request, Response, NextFunction } from 'express';
import { getEvents } from '../services/indexer';

/** GET /api/admin/events */
export async function getAllEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const events = getEvents();
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/fees */
export async function getFeeSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const withdrawals = getEvents('fees_withdrawn').map((e) => e.payload);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    next(err);
  }
}
