import { IGetAllGamesResponse } from '@/app/game/actions/fetch-games';
import { useUsername } from '@/components/custom-hooks/use-user';
import DangerButton from '@/components/ui/buttons/danger-button';
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
  deleteGameFn: (gameName: string) => Promise<void>;
  isDeletingGame: boolean;
};

const GameCard: FC<GameCardProps> = ({
  game,
  isJoined,
  joinGameFn,
  isJoiningGame,
  deleteGameFn,
  isDeletingGame,
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

  const handleDelete = async () => {
    await deleteGameFn(game.name);
  };

  const handleContinue = () => {
    redirectToGame(game.name);
  };

  const isFreezingActions = isJoiningGame || isDeletingGame;

  return (
    <div className='card bg-white'>
      <div className='card-body flex flex-row'>
        <div className='flex-1 my-auto'>
          <p className='text-wrap text-lg font-bold'>{game.name}</p>
          <p>
            Player: {game.players.length} / {MAX_PLAYER_PER_GAME}
          </p>
        </div>
        <div className='flex flex-col flex-1 gap-3'>
          {isJoined && (
            <PrimaryButton
              className='w-full'
              onClick={handleContinue}
              disabled={isFreezingActions}
            >
              Continue
            </PrimaryButton>
          )}
          {!isJoined && (
            <PrimaryButton
              buttonType='outlined'
              className='w-full'
              onClick={handleJoin}
              disabled={isFreezingActions}
            >
              Join Game
            </PrimaryButton>
          )}
          <DangerButton
            className='w-full'
            buttonType='outlined'
            onClick={handleDelete}
            disabled={isFreezingActions || game.players.length > 0}
          >
            Delete
          </DangerButton>
        </div>
      </div>
    </div>
  );
};

export default GameCard;
