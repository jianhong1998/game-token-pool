import { Program } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { Gametokenpool } from '../../target/types/gametokenpool';
import { BN } from 'bn.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const deposit = async (params: {
  userName: string;
  depositAmount: number;
  signers: Keypair[];
  program: Program<Gametokenpool>;
  sendPreflight?: boolean;
}) => {
  const {
    depositAmount,
    program,
    signers,
    userName,
    sendPreflight = true,
  } = params;

  if (signers.length === 0) {
    throw new Error('Signer must be more than 1');
  }

  return await program.methods
    .deposit(userName, new BN(depositAmount))
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signers[0].publicKey,
    })
    .signers(signers)
    .rpc({
      skipPreflight: !sendPreflight,
    });
};
