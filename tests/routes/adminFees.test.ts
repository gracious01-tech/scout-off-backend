import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { logAuditEvent } from '../../src/services/audit';
import * as stellar from '../../src/services/stellar';

const SECRET = process.env.JWT_SECRET ?? 'test-secret';

jest.mock('../../src/services/audit', () => ({
  logAuditEvent: jest.fn(),
}));

jest.mock('../../src/services/stellar', () => ({
  ...jest.requireActual('../../src/services/stellar'),
  withdrawFees: jest.fn(),
}));

jest.mock('../../src/services/indexer', () => ({
  getEvents: jest.fn().mockReturnValue([]),
  indexEvents: jest.fn(),
  normalizeEventId: jest.fn(),
}));

const mockWithdrawFees = stellar.withdrawFees as jest.Mock;
const mockLogAuditEvent = logAuditEvent as jest.Mock;

const ADMIN_WALLET = 'GADMINAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4';
const VALID_RECIPIENT = 'GRECIPIENTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4';

function makeToken(wallet: string, role: string): string {
  return jwt.sign({ sub: wallet, role }, SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Authentication & authorisation ──────────────────────────────────────────

describe('POST /api/admin/fees — auth', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 for a non-admin role (scout)', async () => {
    const token = makeToken('GSCOUT1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'scout');
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Insufficient permissions');
  });

  it('returns 403 for a non-admin role (validator)', async () => {
    const token = makeToken('GVAL1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'validator');
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for an expired token', async () => {
    const expired = jwt.sign({ sub: ADMIN_WALLET, role: 'admin' }, SECRET, { expiresIn: '-1s' });
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${expired}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(401);
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe('POST /api/admin/fees — validation', () => {
  let adminToken: string;

  beforeEach(() => {
    adminToken = makeToken(ADMIN_WALLET, 'admin');
  });

  it('returns 400 when recipient is missing', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for an invalid Stellar address (too short)', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: 'GSHORT' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for an address starting with wrong prefix', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: 'SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for a non-string recipient', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: 12345 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('logs an audit event on validation failure', async () => {
    await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: 'BAD' });
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const call = mockLogAuditEvent.mock.calls[0][0];
    expect(call.action).toBe('fee_withdrawal_attempt');
    expect(call.adminWallet).toBe(ADMIN_WALLET);
    expect(call.queryParams.error).toBe('validation_failed');
  });
});

// ─── No fees available (409) ──────────────────────────────────────────────────

describe('POST /api/admin/fees — no fees (409)', () => {
  let adminToken: string;

  beforeEach(() => {
    adminToken = makeToken(ADMIN_WALLET, 'admin');
    mockWithdrawFees.mockRejectedValue(
      new stellar.FeeWithdrawalError('No fees available to withdraw', 'NO_FEES'),
    );
  });

  it('returns 409 when no fees are available', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/no fees/i);
  });

  it('logs an audit event for no-fees failure', async () => {
    await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const call = mockLogAuditEvent.mock.calls[0][0];
    expect(call.action).toBe('fee_withdrawal_attempt');
    expect(call.adminWallet).toBe(ADMIN_WALLET);
    expect(call.contractAction).toBe('withdraw_fees');
    expect(call.queryParams.recipient).toBe(VALID_RECIPIENT);
  });
});

// ─── Successful withdrawal ────────────────────────────────────────────────────

describe('POST /api/admin/fees — success', () => {
  const feeResult: stellar.FeeWithdrawalResult = {
    transactionId: 'txid-abc123',
    recipient: VALID_RECIPIENT,
    amount: '500000000',
    token: 'XLM',
  };

  let adminToken: string;

  beforeEach(() => {
    adminToken = makeToken(ADMIN_WALLET, 'admin');
    mockWithdrawFees.mockResolvedValue(feeResult);
  });

  it('returns 200 with transaction data on success', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transactionId).toBe('txid-abc123');
    expect(res.body.data.recipient).toBe(VALID_RECIPIENT);
    expect(res.body.data.amount).toBe('500000000');
    expect(res.body.data.token).toBe('XLM');
  });

  it('amount is returned as a string (no precision loss)', async () => {
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(typeof res.body.data.amount).toBe('string');
  });

  it('calls withdrawFees with the validated recipient', async () => {
    await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(mockWithdrawFees).toHaveBeenCalledWith(VALID_RECIPIENT);
  });

  it('logs an audit event on success', async () => {
    await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const call = mockLogAuditEvent.mock.calls[0][0];
    expect(call.action).toBe('fee_withdrawal_attempt');
    expect(call.adminWallet).toBe(ADMIN_WALLET);
    expect(call.contractAction).toBe('withdraw_fees');
    expect(call.queryParams.recipient).toBe(VALID_RECIPIENT);
    expect(call.queryParams.transactionId).toBe('txid-abc123');
    expect(call.queryParams.amount).toBe('500000000');
  });

  it('audit event does not expose the JWT secret or other sensitive fields', async () => {
    await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    const call = mockLogAuditEvent.mock.calls[0][0];
    expect(JSON.stringify(call)).not.toContain(SECRET);
  });
});

// ─── Unexpected errors (500) ──────────────────────────────────────────────────

describe('POST /api/admin/fees — unexpected error', () => {
  it('delegates to error handler for non-FeeWithdrawalError errors', async () => {
    const adminToken = makeToken(ADMIN_WALLET, 'admin');
    mockWithdrawFees.mockRejectedValue(new Error('RPC timeout'));
    const res = await request(app)
      .post('/api/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    // Error handler returns 500 for unhandled errors
    expect(res.status).toBe(500);
    // Audit was still logged
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const call = mockLogAuditEvent.mock.calls[0][0];
    expect(call.action).toBe('fee_withdrawal_attempt');
    expect(call.queryParams.error).toBe('RPC timeout');
  });
});

// ─── API v1 alias ─────────────────────────────────────────────────────────────

describe('POST /api/v1/admin/fees — versioned alias', () => {
  it('responds identically via the /api/v1 prefix', async () => {
    const adminToken = makeToken(ADMIN_WALLET, 'admin');
    mockWithdrawFees.mockRejectedValue(
      new stellar.FeeWithdrawalError('No fees available to withdraw', 'NO_FEES'),
    );
    const res = await request(app)
      .post('/api/v1/admin/fees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient: VALID_RECIPIENT });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
