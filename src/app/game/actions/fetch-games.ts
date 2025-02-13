'use server';

import { getPools } from '@/app/admin/actions/pool';
import { AccountUtil } from '@/util/server/account.util';
import { ConnectionUtil } from '@/util/server/connection';
import { getAccount } from '@solana/spl-token';

export interface IGetAllGamesResponse {
  name: string;
  players: string[];
  publicKey: string;
  tokenAccountPublicKey: string;
}

export interface IGetGameDetailsResponse extends IGetAllGamesResponse {
  totalToken: number;
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

export const getGameDetails = async (
  gameName: string,
  poolPublicKey: string
): Promise<IGetGameDetailsResponse> => {
  const program = ConnectionUtil.getProgram();
  const connection = ConnectionUtil.getConnection();

  const gamePublicKey = AccountUtil.getGamePublicKey(gameName, poolPublicKey);

  const game = await program.account.game.fetch(gamePublicKey);

  const gameTokenAccount = await getAccount(connection, game.gameTokenAccount);

  return {
    name: game.gameName,
    players: game.players.map((key) => key.toBase58()),
    publicKey: gamePublicKey.toBase58(),
    tokenAccountPublicKey: game.gameTokenAccount.toBase58(),
    totalToken: Number(gameTokenAccount.amount),
  };
};
