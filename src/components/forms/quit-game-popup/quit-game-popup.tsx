'use client';

import { useUserQuitGame } from '@/components/queries/game/quit-game-query';
import DangerButton from '@/components/ui/buttons/danger-button';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import { useQueryClient } from '@tanstack/react-query';
import { FC, useEffect } from 'react';

interface QuitGamePopupProps {
  isPopupOpen: boolean;
  closePopupFn: () => void;
  username: string;
  gameName: string;
  poolPublicKey: string;
}

const QuitGamePopup: FC<QuitGamePopupProps> = ({
  closePopupFn,
  isPopupOpen,
  gameName,
  username,
  poolPublicKey,
}) => {
  const {
    mutateAsync: quitGameFn,
    isPending: isQuitGamePending,
    isSuccess: isQuitGameSuccess,
    reset: resetQuitGameState,
  } = useUserQuitGame();

  const queryClient = useQueryClient();

  const handleQuitGame = async () => {
    await quitGameFn({ gameName, username });
  };

  useEffect(() => {
    if (isQuitGameSuccess) {
      resetQuitGameState();
      queryClient.invalidateQueries({
        queryKey: ['game', 'all'],
      });
      queryClient.invalidateQueries({
        queryKey: ['game', 'one', { poolPublicKey, gameName }],
      });
    }
  }, [
    isQuitGameSuccess,
    gameName,
    poolPublicKey,
    queryClient,
    resetQuitGameState,
  ]);

  if (!isPopupOpen) return <></>;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        <div>
          <h2 className='text-2xl font-bold mb-4 text-center'>
            Quit {gameName}
          </h2>
          <p>You will quit the game and can join back to the game anytime.</p>
        </div>
        <div className='flex flex-row gap-3 w-full justify-between'>
          <DangerButton
            buttonType='contained'
            className='flex-1'
            disabled={isQuitGamePending}
            onClick={handleQuitGame}
          >
            End Game
          </DangerButton>
          <PrimaryButton
            buttonType='outlined'
            className='flex-1'
            onClick={() => closePopupFn()}
            disabled={isQuitGamePending}
          >
            Close
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default QuitGamePopup;
