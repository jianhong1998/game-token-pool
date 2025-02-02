'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

export const userEndGame = async (params: { username: string }) => {
  const { username } = params;
  const LOG_KEY = '[User End Game]';

  const connection = ConnectionUtil.getConnection();
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();

  const instruction = await program.methods
    .userEndGame(username)
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions: [instruction],
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([signer]);

  const transactionId = await connection.sendTransaction(transaction);

  console.log(
    `${LOG_KEY} User (${username}) end game transaction is sent: ${transactionId}`
  );

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'finalized'
  );

  console.log(`${LOG_KEY} Transaction ${transactionId} is finalized.`);
};
