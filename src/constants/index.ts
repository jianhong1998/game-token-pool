import { join } from 'path';

export const {
  FEE_PAYER_KEY,
  ADMIN_PASSWORD,
  ANCHOR_WALLET = join(__dirname, '../config/keypairs/fee-payer.json'),
  SOLANA_CLUSTER_TYPE = 'localnet',
  NODE_ENV,
} = process.env;
