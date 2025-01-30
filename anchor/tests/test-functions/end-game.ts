import { Program } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { Gametokenpool } from '../../target/types/gametokenpool';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const endGame = async (params: {
  userName: string;
  signers: Keypair[];
  program: Program<Gametokenpool>;
  sendPreflight?: boolean;
}) => {
  const { program, signers, userName, sendPreflight = true } = params;

  return await program.methods
    .userEndGame(userName)
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signers[0].publicKey,
    })
    .signers(signers)
    .rpc({ skipPreflight: !sendPreflight });
};
