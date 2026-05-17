import request from 'supertest';
import app from '../../src/index';

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('GET /api/players', () => {
  it('returns paginated list', async () => {
    const res = await request(app).get('/api/players');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('rejects invalid minTier', async () => {
    const res = await request(app).get('/api/players?minTier=99');
    expect(res.status).toBe(500); // zod throws → errorHandler
  });
});

describe('GET /auth/challenge', () => {
  it('returns XDR for a valid account', async () => {
    const { Keypair } = await import('@stellar/stellar-sdk');
    const account = Keypair.random().publicKey();
    const res = await request(app).get(`/auth/challenge?account=${account}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.transaction).toBe('string');
  });

  it('returns error for missing account', async () => {
    const res = await request(app).get('/auth/challenge');
    expect(res.status).toBe(500);
  });
});
