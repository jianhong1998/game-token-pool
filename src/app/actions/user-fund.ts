'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { BN } from 'bn.js';

export const deposit = async (params: {
  cashAmount: number;
  username: string;
}) => {
  const { cashAmount, username } = params;
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();
  const connection = ConnectionUtil.getConnection();

  const tokenAmount = Math.floor(cashAmount * 100);

  const instruction = await program.methods
    .deposit(username, new BN(tokenAmount))
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

  console.log(`[Deposit] Transaction is sent: ${transactionId}`);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );

  console.log(`[Deposit] Transaction is finalised: ${transactionId}`);
};

export const transfer = async (params: {
  fromUsername: string;
  toUsername: string;
  cashAmount: number;
}) => {
  const { cashAmount, fromUsername, toUsername } = params;
  const LOG_KEY = '[Transfer Between User]';

  const connection = ConnectionUtil.getConnection();
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();

  const instruction = await program.methods
    .transferTokenBetweenUsers(
      fromUsername,
      toUsername,
      new BN(cashAmount * 100)
    )
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
    `${LOG_KEY} Transaction for token transfering from "${fromUsername}" to "${toUsername}" is sent: ${transactionId}`
  );

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );

  console.log(`Transaction (${transactionId}) is confirmed.`);
};
