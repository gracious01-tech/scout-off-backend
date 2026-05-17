import { Request, Response, NextFunction } from 'express';
import { getEvents } from '../services/indexer';
import { ApiResponse } from '../types';

/** GET /api/scouts/:wallet/subscription */
export async function getSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const { wallet } = req.params;
    const subs = getEvents('scout_subscribed').filter((e) => e.payload.scout === wallet);
    const latest = subs.at(-1);
    res.json({ success: true, data: latest?.payload ?? null });
  } catch (err) {
    next(err);
  }
}

/** GET /api/scouts/:wallet/contacts */
export async function getUnlockedContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { wallet } = req.params;
    const contacts = getEvents('contact_unlocked').filter((e) => e.payload.scout === wallet);
    res.json({ success: true, data: contacts.map((e) => e.payload) });
  } catch (err) {
    next(err);
  }
}
