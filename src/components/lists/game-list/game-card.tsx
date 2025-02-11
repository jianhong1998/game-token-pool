import { IGetAllGamesResponse } from '@/app/game/actions/fetch-games';
import { useUsername } from '@/components/custom-hooks/use-user';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import { MAX_PLAYER_PER_GAME } from '@/constants';
import { NotificationUtil } from '@/util/client/notification.util';
import { useRouter } from 'next/navigation';
import { FC } from 'react';

type GameCardProps = {
  game: IGetAllGamesResponse;
  isJoined: boolean;
  joinGameFn: (params: { username: string; gameName: string }) => Promise<void>;
  isJoiningGame: boolean;
};

const GameCard: FC<GameCardProps> = ({
  game,
  isJoined,
  joinGameFn,
  isJoiningGame,
}) => {
  const username = useUsername();
  const router = useRouter();

  const redirectToGame = (gameName: string) => {
    router.push(`/game/${encodeURI(gameName)}`);
  };

  const handleJoin = async () => {
    if (!username) {
      NotificationUtil.error('Not logged in yet');
      router.replace('/');
      return;
    }

    try {
      await joinGameFn({ gameName: game.name, username });
      redirectToGame(game.name);
    } catch (error) {}
  };

  const handleContinue = () => {
    redirectToGame(game.name);
  };

  return (
    <div className='card bg-white'>
      <div className='card-body flex flex-row'>
        <div className='flex-1'>
          <p className='text-wrap text-lg font-bold'>{game.name}</p>
          <p>
            Player: {game.players.length} / {MAX_PLAYER_PER_GAME}
          </p>
        </div>
        <div className='flex-1'>
          {isJoined && (
            <PrimaryButton
              className='w-full'
              onClick={handleContinue}
              disabled={isJoiningGame}
            >
              Continue
            </PrimaryButton>
          )}
          {!isJoined && (
            <PrimaryButton
              buttonType='outlined'
              className='w-full'
              onClick={handleJoin}
              disabled={isJoiningGame}
            >
              Join Game
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameCard;
