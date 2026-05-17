import { buildChallenge, verifyAndIssueToken } from '../../src/services/sep10';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';

const clientKeypair = Keypair.random();

describe('sep10', () => {
  it('buildChallenge returns a valid XDR string', () => {
    const xdr = buildChallenge(clientKeypair.publicKey());
    expect(typeof xdr).toBe('string');
    expect(xdr.length).toBeGreaterThan(0);
  });

  it('verifyAndIssueToken issues a JWT after client signs the challenge', () => {
    const xdr = buildChallenge(clientKeypair.publicKey());
    const tx = new Transaction(xdr, Networks.TESTNET);
    tx.sign(clientKeypair);
    const signedXdr = tx.toXDR();

    const { token, account } = verifyAndIssueToken(signedXdr);
    expect(typeof token).toBe('string');
    expect(account).toBe(clientKeypair.publicKey());
  });

  it('verifyAndIssueToken throws on unsigned challenge', () => {
    const xdr = buildChallenge(clientKeypair.publicKey());
    expect(() => verifyAndIssueToken(xdr)).toThrow('Invalid challenge signature');
  });
});
