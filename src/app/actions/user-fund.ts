'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { LinkGeneratorUtil } from '@/util/shared/link-generator.util';
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

interface ITranferParams {
  fromUsername: string;
  toUsername: string;
  cashAmount: number;
}

export const transfer = async (params: ITranferParams) => {
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
    'processed'
  );

  console.log(`Transaction (${transactionId}) is processed.`);
};

export const bulkTransfer = async (transferParamsArray: ITranferParams[]) => {
  const LOG_KEY = '[Bulk Transfer to User]';

  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();
  const signer = ConnectionUtil.getSigner();

  const transferInstructionPromises = transferParamsArray.map(
    ({ cashAmount, fromUsername, toUsername }) => {
      return program.methods
        .transferTokenBetweenUsers(
          fromUsername,
          toUsername,
          new BN(cashAmount * 100)
        )
        .accounts({ tokenProgram: TOKEN_PROGRAM_ID, signer: signer.publicKey })
        .signers([signer])
        .instruction();
    }
  );

  const instructions = await Promise.all(transferInstructionPromises);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions,
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([signer]);

  const transactionId = await connection.sendTransaction(transaction);
  console.log(`${LOG_KEY} Transaction is sent: ${transactionId}`);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'processed'
  );
  const url = LinkGeneratorUtil.generateTransactionLink(transactionId);
  console.log(`${LOG_KEY} Transaction is processed: ${url}`);
};

export const transferToGame = async (params: {
  gameName: string;
  username: string;
  amount: number;
}) => {
  const LOG_KEY = '[Transfer To Game]';
  const { amount, gameName, username } = params;
  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();
  const signer = ConnectionUtil.getSigner();

  const transferTokenInstruction = await program.methods
    .userTransferTokenToGame(gameName, username, new BN(amount))
    .accounts({ tokenProgram: TOKEN_PROGRAM_ID, signer: signer.publicKey })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    instructions: [transferTokenInstruction],
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMessage);
  transaction.sign([signer]);

  console.log(`${LOG_KEY} Transaction is sent.`);
  const transactionId = await connection.sendTransaction(transaction);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'processed'
  );

  console.log(
    `${LOG_KEY} Transaction is confirmed: ${LinkGeneratorUtil.generateTransactionLink(
      transactionId
    )}`
  );
};
