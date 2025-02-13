'use server';

import { ConnectionUtil } from '@/util/server/connection';
import { LinkGeneratorUtil } from '@/util/shared/link-generator.util';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { BN } from 'bn.js';

type ITakeTokenFromGameParams = {
  gameName: string;
  username: string;
  cashAmount: number;
};

export const takeTokenFromGame = async (params: ITakeTokenFromGameParams) => {
  const { gameName, username, cashAmount } = params;
  const LOG_KEY = '[Take Token From Game]';

  const connection = ConnectionUtil.getConnection();
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();

  const tokenAmount = cashAmount * 100;

  const takeTokenFromGameInstruction = await program.methods
    .takeTokenFromGame(gameName, username, new BN(tokenAmount))
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transactionMesage = new TransactionMessage({
    instructions: [takeTokenFromGameInstruction],
    payerKey: signer.publicKey,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(transactionMesage);
  transaction.sign([signer]);

  const transactionId = await connection.sendTransaction(transaction);
  console.log(`${LOG_KEY} Transaction is sent: ${transactionId}`);

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );
  const url = LinkGeneratorUtil.generateTransactionLink(transactionId);

  console.log(`${LOG_KEY} Transaction is confirmed: ${url}`);
};
