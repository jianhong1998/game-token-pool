import { Program } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { Gametokenpool } from '../../target/types/gametokenpool';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * @returns Transaction signature
 */
export const createPool = async (params: {
  poolName: string;
  signers: Keypair[];
  program: Program<Gametokenpool>;
  sendPreflight?: boolean;
}) => {
  const { program, signers, poolName, sendPreflight = true } = params;

  if (signers.length === 0) {
    throw new Error('Signer must be more than 1');
  }

  return await program.methods
    .initPool(poolName)
    .accounts({
      signer: signers[0].publicKey,
    })
    .signers(signers)
    .rpc({
      skipPreflight: !sendPreflight,
    });
};

/**
 * @returns Transaction signature
 */
export const createPoolTokenAccount = async (params: {
  signers: Keypair[];
  program: Program<Gametokenpool>;
  sendPreflight?: boolean;
}) => {
  const { program, signers, sendPreflight = true } = params;

  if (signers.length === 0) {
    throw new Error('Signer must be more than 1');
  }

  return await program.methods
    .initPoolTokenAccount()
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signers[0].publicKey,
    })
    .signers(signers)
    .rpc({
      skipPreflight: !sendPreflight,
    });
};
