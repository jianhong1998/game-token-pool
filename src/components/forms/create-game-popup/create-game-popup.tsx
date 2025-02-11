import { useUsername } from '@/components/custom-hooks/use-user';
import { useCreateGame } from '@/components/queries/game/create-game-query';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import TextInput from '@/components/ui/inputs/text-input';
import { NotificationUtil } from '@/util/client/notification.util';
import { useRouter } from 'next/navigation';
import { FC, useState } from 'react';

interface CreateGamePopupProps {
  closePopupFn: () => void;
  isPopupOpen: boolean;
}

const CreateGamePopup: FC<CreateGamePopupProps> = ({
  closePopupFn,
  isPopupOpen,
}) => {
  const username = useUsername();
  const [gameName, setGameName] = useState<string>('');

  const router = useRouter();

  const { mutateAsync: createGameFn, isPending: isPendingCreateGame } =
    useCreateGame();

  const handleClosePopup = () => {
    setGameName('');
    closePopupFn();
  };

  const handleCreateGame = async () => {
    if (!username) return;

    await createGameFn({ gameName, username });
    handleClosePopup();
  };

  if (!username) {
    NotificationUtil.error('Please login first');
    router.replace('/');

    return;
  }

  if (!isPopupOpen) return <></>;

  return (
    <>
      <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
        <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
          <div>
            <h2 className='text-2xl font-bold mb-4 text-primary text-center'>
              Create Game
            </h2>
            <TextInput
              value={gameName}
              setValue={setGameName}
              disabled={isPendingCreateGame}
              onEnterPressed={() => handleCreateGame()}
            />
          </div>
          <div className='flex flex-row gap-3 w-full justify-between'>
            <PrimaryButton
              buttonType='contained'
              className='flex-1'
              onClick={handleCreateGame}
              disabled={isPendingCreateGame || gameName.trim().length === 0}
            >
              Create Game
            </PrimaryButton>
            <PrimaryButton
              buttonType='outlined'
              className='flex-1'
              onClick={handleClosePopup}
              disabled={isPendingCreateGame}
            >
              Close
            </PrimaryButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateGamePopup;
