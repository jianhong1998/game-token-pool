'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';

export const getPools = async () => {
  const program = ConnectionUtil.getProgram();

  const pools = await program.account.pool.all();

  return pools.map((pool) => ({
    publicKey: pool.publicKey.toBase58(),
    name: pool.account.poolName,
  }));
};

export const initPool = async (params: { poolName: string }) => {
  const { poolName } = params;
  const LOG_KEY = '[initPool]';

  const signer = ConnectionUtil.getSigner();
  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();

  const initPoolInstruction = await program.methods
    .initPool(poolName)
    .accounts({
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const initPoolTokenAccountInstruction = await program.methods
    .initPoolTokenAccount()
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transactionMessage = new TransactionMessage({
    payerKey: signer.publicKey,
    instructions: [initPoolInstruction, initPoolTokenAccountInstruction],
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const versionedTransaction = new VersionedTransaction(transactionMessage);
  versionedTransaction.sign([signer]);

  const transactionId = await connection.sendTransaction(versionedTransaction);

  console.log(`${LOG_KEY} Transaction sent: ${transactionId}`);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );

  console.log(`${LOG_KEY} Transaction finalized: ${transactionId}`);
};

export const closePool = async () => {
  const LOG_KEY = '[Close Pool]';

  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();
  const signer = ConnectionUtil.getSigner();

  const instruction = await program.methods
    .closePool()
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const message = new TransactionMessage({
    instructions: [instruction],
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();
  const transaction = new VersionedTransaction(message);
  transaction.sign([signer]);

  const transactionId = await connection.sendTransaction(transaction, {
    skipPreflight: true,
  });

  console.log(`${LOG_KEY} Close pool transaction is sent: ${transactionId}`);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );

  console.log(`${LOG_KEY} Transaction (${transactionId}) is confirmed.`);
};
