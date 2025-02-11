import { IGetAllGamesResponse } from '@/app/game/actions/fetch-games';
import { FC, useMemo } from 'react';
import GameCard from './game-card';
import { useJoinGame } from '@/components/queries/game/join-game-query';

type GameListProps = {
  gameData: IGetAllGamesResponse[];
  currentUserPublicKey: string;
};

const GameList: FC<GameListProps> = ({ gameData, currentUserPublicKey }) => {
  const { joinedGames, notJoinedGames } = useMemo(() => {
    const joinedGames = [] as IGetAllGamesResponse[];
    const notJoinedGames = [] as IGetAllGamesResponse[];

    gameData.forEach((game) => {
      const isUserJoined = game.players.some(
        (playerKey) => playerKey === currentUserPublicKey
      );

      if (isUserJoined) {
        joinedGames.push(game);
      } else {
        notJoinedGames.push(game);
      }
    });

    return { joinedGames, notJoinedGames };
  }, [gameData, currentUserPublicKey]);

  const { mutateAsync: joinGameFn, isPending: isJoiningGame } = useJoinGame();

  if (gameData.length === 0) {
    return <p className='text-center text-xl font-bold'>No Game Created</p>;
  }

  return (
    <div className='flex flex-col gap-3'>
      {joinedGames.map((game) => (
        <GameCard
          key={game.publicKey}
          game={game}
          isJoined
          isJoiningGame={isJoiningGame}
          joinGameFn={joinGameFn}
        />
      ))}
      {notJoinedGames.map((game) => (
        <GameCard
          key={game.publicKey}
          game={game}
          isJoined={false}
          isJoiningGame={isJoiningGame}
          joinGameFn={joinGameFn}
        />
      ))}
    </div>
  );
};

export default GameList;
