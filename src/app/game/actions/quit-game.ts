'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { LinkGeneratorUtil } from '@/util/shared/link-generator.util';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

export interface IUserQuitGameParams {
  username: string;
  gameName: string;
}

export const userQuitGame = async (params: IUserQuitGameParams) => {
  const { gameName, username } = params;
  const LOG_KEY = '[User Quit Game]';

  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();
  const signer = ConnectionUtil.getSigner();

  const quitGameInstruction = await program.methods
    .userQuitGame(gameName, username)
    .accounts({ tokenProgram: TOKEN_PROGRAM_ID, signer: signer.publicKey })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions: [quitGameInstruction],
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([signer]);

  const transactionId = await connection.sendTransaction(transaction);

  console.log(
    `${LOG_KEY} Sent transaction for user quit game (${transactionId})`
  );

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'finalized'
  );
  const url = LinkGeneratorUtil.generateTransactionLink(transactionId);

  console.log(`${LOG_KEY} Transaction confirmed ✅: ${url}`);
};
