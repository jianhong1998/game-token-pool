'use server';

import { ErrorCode } from '@/constants/error';
import { ConnectionUtil } from '@/util/server/connection';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

export const userEndGame = async (params: { username: string }) => {
  const { username } = params;
  const LOG_KEY = '[User End Game]';

  const connection = ConnectionUtil.getConnection();
  const program = ConnectionUtil.getProgram();
  const signer = ConnectionUtil.getSigner();

  const userSeeds = [
    Buffer.from('user'),
    Buffer.from(username),
    signer.publicKey.toBuffer(),
  ];
  const [userPublicKey] = PublicKey.findProgramAddressSync(
    userSeeds,
    program.programId
  );

  const allGames = await program.account.game.all();

  const userInvolvedGames = allGames.filter((game) => {
    const gamePlayerKeys = game.account.players.map((publicKey) =>
      publicKey.toBase58()
    );

    return gamePlayerKeys.includes(userPublicKey.toBase58());
  });

  const instructions = [] as TransactionInstruction[];

  const userQuitGameInstructions = await Promise.all(
    userInvolvedGames.map((game) =>
      program.methods
        .userQuitGame(game.account.gameName, username)
        .accounts({ tokenProgram: TOKEN_PROGRAM_ID, signer: signer.publicKey })
        .instruction()
    )
  );

  console.log({
    userInvolvedGames,
    userQuitGameInstructions,
  });

  instructions.push(...userQuitGameInstructions);

  const userEndGameInstruction = await program.methods
    .userEndGame(username)
    .accounts({
      tokenProgram: TOKEN_PROGRAM_ID,
      signer: signer.publicKey,
    })
    .signers([signer])
    .instruction();

  instructions.push(userEndGameInstruction);

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

  console.log(
    `${LOG_KEY} User (${username}) end game transaction is sent: ${transactionId}`
  );

  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature: transactionId,
    },
    'confirmed'
  );

  console.log(`${LOG_KEY} Transaction ${transactionId} is finalized.`);
};
