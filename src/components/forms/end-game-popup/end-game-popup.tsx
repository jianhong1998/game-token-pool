import { useUserEndGame } from '@/components/queries/user/user-end-game-queries';
import DangerButton from '@/components/ui/buttons/danger-button';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import { FC } from 'react';

type EndGamePopupProps = {
  isPopupOpen: boolean;
  username: string;
  togglePopupFn: () => void;
};

const EndGamePopup: FC<EndGamePopupProps> = ({
  isPopupOpen,
  username,
  togglePopupFn,
}) => {
  const { mutateAsync: endGameFn, isPending: isUserEndGamePending } =
    useUserEndGame();

  const handleUserEndGame = async () => {
    await endGameFn({ username });
  };

  if (!isPopupOpen) return <></>;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        <div>
          <h2 className='text-2xl font-bold mb-4 text-error text-center'>
            Are you sure
          </h2>
          <p>
            By confirm ending the game, your account will be fully deleted and
            not able to be recovered.
          </p>
        </div>
        <div className='flex flex-row gap-3 w-full justify-between'>
          <DangerButton
            buttonType='contained'
            className='flex-1'
            disabled={isUserEndGamePending}
            onClick={handleUserEndGame}
          >
            End Game
          </DangerButton>
          <PrimaryButton
            buttonType='outlined'
            className='flex-1'
            onClick={togglePopupFn}
            disabled={isUserEndGamePending}
          >
            Close
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default EndGamePopup;
