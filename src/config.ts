import dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

const ConfigSchema = z.object({
  port: z.coerce.number().default(4000),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
  networkPassphrase: z.string().default('Test SDF Network ; September 2015'),
  horizonUrl: z.string().url().default('https://horizon-testnet.stellar.org'),
  sorobanRpcUrl: z.string().url().default('https://soroban-testnet.stellar.org'),
  contractId: z.string().min(1),
  jwtSecret: z.string().min(1),
  pinata: z.object({
    apiKey: z.string().default(''),
    secret: z.string().default(''),
    gateway: z.string().url().default('https://gateway.pinata.cloud'),
  }),
  platformFeeBps: z.coerce.number().default(500),
  dbPath: z.string().default('scout-off.db'),
});

const config = ConfigSchema.parse(process.env);

export default config;
