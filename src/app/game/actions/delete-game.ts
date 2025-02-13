'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { LinkGeneratorUtil } from '@/util/shared/link-generator.util';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

export const deleteGame = async (gameName: string) => {
  const LOG_KEY = '[Delete Game]';
  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();
  const signer = ConnectionUtil.getSigner();

  const instruction = await program.methods
    .deleteGame(gameName)
    .accounts({ tokenProgram: TOKEN_PROGRAM_ID })
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
  console.log(`${LOG_KEY} Transaction sent: ${transactionId}`);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );
  const url = LinkGeneratorUtil.generateTransactionLink(transactionId);
  console.log(`${LOG_KEY} Transaction confirmed: ${url}`);
};
