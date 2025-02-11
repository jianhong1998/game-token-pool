'use server';

import { ConnectionUtil } from '@/util/server/connection';

export interface IGetAllGamesResponse {
  name: string;
  players: string[];
  publicKey: string;
  tokenAccountPublicKey: string;
}

export const getAllGames = async (params: {
  username: string;
  poolPublicKey: string;
}): Promise<IGetAllGamesResponse[]> => {
  const { poolPublicKey, username } = params;

  const program = ConnectionUtil.getProgram();

  const games = await program.account.game.all();

  return games
    .filter((game) => game.account.pool.toBase58() === poolPublicKey)
    .map((game) => ({
      name: game.account.gameName,
      players: game.account.players.map((playerPubKey) =>
        playerPubKey.toBase58()
      ),
      publicKey: game.publicKey.toBase58(),
      tokenAccountPublicKey: game.account.gameTokenAccount.toBase58(),
    }));
};
