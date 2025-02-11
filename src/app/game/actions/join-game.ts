'use server';

import { ErrorCode } from '@/constants/error';
import { ConnectionUtil } from '@/util/server/connection';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

export const joinGame = async (params: {
  gameName: string;
  username: string;
}) => {
  const { gameName, username } = params;
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();
  const connection = ConnectionUtil.getConnection();

  try {
    const instruction = await program.methods
      .userJoinGame(gameName, username)
      .accounts({
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
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    });

    console.log(
      `[Join Game] User join game transaction confirmed: ${transactionId}`
    );
  } catch (error) {
    const message = (error as Error).message;

    if (message.includes(ErrorCode.USER_ALREADY_JOINED_GAME)) {
      throw new Error(ErrorCode.USER_ALREADY_JOINED_GAME);
    }

    throw error;
  }
};
