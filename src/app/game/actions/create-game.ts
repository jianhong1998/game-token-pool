'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  Transaction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export const createGame = async (params: { gameName: string }) => {
  const { gameName } = params;
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();
  const conneciton = ConnectionUtil.getConnection();

  const initGameInstruction = await program.methods
    .initGame(gameName)
    .accounts({
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const initGameTokenAccountInstruction = await program.methods
    .initGameTokenAccount(gameName)
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await conneciton.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions: [initGameInstruction, initGameTokenAccountInstruction],
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([signer]);

  const transactionId = await conneciton.sendTransaction(transaction);

  await conneciton.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );
};
