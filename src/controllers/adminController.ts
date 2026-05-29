import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getEvents } from '../services/indexer';

const eventsQuerySchema = z.object({
  eventType: z.string().optional(),
  startDate: z.coerce.number().optional(),
  endDate: z.coerce.number().optional(),
});

/** GET /api/admin/events */
export async function getAllEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { eventType, startDate, endDate } = eventsQuerySchema.parse(req.query);
    const adminWallet = (req as any).account;

    console.info({
      method: req.method,
      path: req.path,
      adminWallet,
      eventType,
      startDate,
      endDate,
    });

    let events = getEvents();

    if (eventType) {
      events = events.filter((e) => e.type === eventType);
    }

    // Note: Since events don't have timestamps, we'll just log startDate/endDate for now
    // Once events have timestamps, filter by those here

    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/fees */
export async function getFeeSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const adminWallet = (req as any).account;

    console.info({
      method: req.method,
      path: req.path,
      adminWallet,
    });

    const withdrawals = getEvents('fees_withdrawn').map((e) => e.payload);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    next(err);
  }
}
