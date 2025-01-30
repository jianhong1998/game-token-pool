import { FEE_PAYER_KEY } from '@/constants';
import { Keypair } from '@solana/web3.js';

export const getFeePayerKeypair = async () => {
  const keyString = FEE_PAYER_KEY;
  if (!keyString) throw new Error(`Invalid FEE_PAYER_KEY: ${keyString}`);

  const uint8 = Uint8Array.from(JSON.parse(keyString) as number[]);
  return Keypair.fromSecretKey(uint8);
};
