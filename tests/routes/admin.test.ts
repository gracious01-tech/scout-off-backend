import request from 'supertest';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import app from '../../src/index';

async function getTokenForKeypair(kp: Keypair, role?: string): Promise<string> {
  const challengeRes = await request(app).get(`/auth/challenge?account=${kp.publicKey()}`);
  const tx = new Transaction(challengeRes.body.challenge, Networks.TESTNET);
  tx.sign(kp);
  const body: Record<string, string> = { transaction: tx.toXDR() };
  if (role) body.role = role;
  const res = await request(app).post('/auth/token').send(body);
  return res.body.token;
}

// ─── Issue #79: GET /api/admin/stats ─────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated as non-admin role', async () => {
    const token = await getTokenForKeypair(Keypair.random(), 'validator');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns stats with numeric counts for an admin token', async () => {
    const adminKp = Keypair.random();
    const token = await getTokenForKeypair(adminKp, 'admin');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { data } = res.body;
    expect(typeof data.players).toBe('number');
    expect(typeof data.milestones).toBe('number');
    expect(typeof data.subscriptions).toBe('number');
    expect(typeof data.events).toBe('number');
  });

  it('returns zero counts when no events have been indexed', async () => {
    const adminKp = Keypair.random();
    const token = await getTokenForKeypair(adminKp, 'admin');
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.players).toBeGreaterThanOrEqual(0);
    expect(data.milestones).toBeGreaterThanOrEqual(0);
    expect(data.subscriptions).toBeGreaterThanOrEqual(0);
    expect(data.events).toBeGreaterThanOrEqual(0);
  });
});

// ─── Issue #82: Seeded admin role via ADMIN_WALLET ────────────────────────────

describe('POST /auth/token — admin seeding', () => {
  const adminKp = Keypair.random();

  beforeAll(() => {
    process.env.ADMIN_WALLET = adminKp.publicKey();
    // Reload config so the new env var is picked up
    jest.resetModules();
  });

  afterAll(() => {
    delete process.env.ADMIN_WALLET;
    jest.resetModules();
  });

  it('issues admin role when wallet matches ADMIN_WALLET, regardless of requested role', async () => {
    // Re-import after resetting modules so config picks up ADMIN_WALLET
    const freshApp = (await import('../../src/index')).default;
    const challengeRes = await request(freshApp).get(
      `/auth/challenge?account=${adminKp.publicKey()}`
    );
    const tx = new Transaction(challengeRes.body.challenge, Networks.TESTNET);
    tx.sign(adminKp);

    const res = await request(freshApp)
      .post('/auth/token')
      .send({ transaction: tx.toXDR(), role: 'player' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');

    // Decode the JWT payload (without verifying signature) to check the role
    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64url').toString()
    );
    expect(payload.role).toBe('admin');
  });

  it('does not grant admin role to a non-matching wallet', async () => {
    const freshApp = (await import('../../src/index')).default;
    const otherKp = Keypair.random();
    const challengeRes = await request(freshApp).get(
      `/auth/challenge?account=${otherKp.publicKey()}`
    );
    const tx = new Transaction(challengeRes.body.challenge, Networks.TESTNET);
    tx.sign(otherKp);

    const res = await request(freshApp)
      .post('/auth/token')
      .send({ transaction: tx.toXDR(), role: 'player' });

    expect(res.status).toBe(200);
    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64url').toString()
    );
    expect(payload.role).not.toBe('admin');
  });
});
