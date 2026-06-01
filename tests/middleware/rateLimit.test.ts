/**
 * Tests for the rateLimit middleware.
 * Sets RATE_LIMIT_ENABLED=true and a low MAX to trigger 429 responses.
 */

process.env.RATE_LIMIT_ENABLED = 'true';
process.env.RATE_LIMIT_MAX = '3';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4';
process.env.JWT_SECRET = 'test-secret';

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { rateLimit, resetStore } from '../../src/middleware/rateLimit';

function makeApp() {
  const app = express();
  app.get('/test', rateLimit, (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  // Catch-all error handler so we see the actual error
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

describe('rateLimit middleware', () => {
  beforeEach(() => resetStore());

  it('allows requests within the limit', async () => {
    const app = makeApp();
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when the limit is exceeded', async () => {
    const app = makeApp();
    for (let i = 0; i < 3; i++) {
      await request(app).get('/test');
    }
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/too many requests/i);
  });

  it('passes through when RATE_LIMIT_ENABLED is false', async () => {
    process.env.RATE_LIMIT_ENABLED = 'false';
    const app = makeApp();
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
    process.env.RATE_LIMIT_ENABLED = 'true';
  });
});
