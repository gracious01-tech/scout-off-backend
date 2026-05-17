import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
  Keypair,
} from '@stellar/stellar-sdk';
import { server, networkPassphrase } from '../services/stellar';
import config from '../config';

/**
 * Build, simulate, and submit a Soroban contract invocation.
 * @param sourceKeypair - Keypair of the transaction source account
 * @param method        - Contract function name
 * @param args          - Array of xdr.ScVal arguments
 */
export async function invokeContract(
  sourceKeypair: Keypair,
  method: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const account = await server.getAccount(sourceKeypair.publicKey());
  const contract = new Contract(config.contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  // Simulate to get footprint + resource fee
  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  preparedTx.sign(sourceKeypair);

  const sendResult = await server.sendTransaction(preparedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${sendResult.errorResult}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed on-chain');
  }

  const successResult = getResult as SorobanRpc.Api.GetSuccessfulTransactionResponse;
  return successResult.returnValue ? scValToNative(successResult.returnValue) : null;
}

/** Convenience: convert a plain string to ScVal */
export const strVal = (s: string) => nativeToScVal(s, { type: 'string' });

/** Convenience: convert a number to ScVal u32 */
export const u32Val = (n: number) => nativeToScVal(n, { type: 'u32' });
