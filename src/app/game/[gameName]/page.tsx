'use client';

import { useUsername } from '@/components/custom-hooks/use-user';
import GameDetailCard from '@/components/dashboard/game-details-card/game-details-card';
import SelfUserCard from '@/components/dashboard/user-card/self-user-card';
import DepositPopup from '@/components/forms/deposit-popup/deposit-popup';
import EndGamePopup from '@/components/forms/end-game-popup/end-game-popup';
import QuitGamePopup from '@/components/forms/quit-game-popup/quit-game-popup';
import { useGetGameDetails } from '@/components/queries/game/get-game-queries';
import { useGetPools } from '@/components/queries/pool/use-pool';
import { useGetUser } from '@/components/queries/user/user-data-queries';
import DangerButton from '@/components/ui/buttons/danger-button';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import Divider from '@/components/ui/divider';
import { PageContext } from '@/types/page-context.type';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface GameDashboardPageProps {
  gameName: string;
}

const GameDashboardPage: NextPage<PageContext<GameDashboardPageProps>> = ({
  params: { gameName },
}) => {
  const decodedGameName = decodeURI(gameName);

  const [isDeleteAccountPopupOpen, setIsDeleteAccountPopupOpen] =
    useState<boolean>(false);
  const [isDepositPopupOpen, setIsDepositPopupOpen] = useState<boolean>(false);
  const [isQuitGamePopupOpen, setIsQuitGamePopupOpen] =
    useState<boolean>(false);

  const username = useUsername();

  const router = useRouter();

  const { data: pools } = useGetPools();
  const { data: gameDetail } = useGetGameDetails({
    gameName: decodedGameName,
    poolPublicKey: pools?.map((pool) => pool.publicKey)[0],
  });
  const { data: user } = useGetUser(username.length > 0 ? username : null);

  const handleTransferToGame = () => {};

  const toggleQuitGamePopup = () => {
    setIsQuitGamePopupOpen((prev) => !prev);
  };

  const handleWinGame = () => {};

  const toggleDeleteAccountPopup = () => {
    setIsDeleteAccountPopupOpen((prev) => !prev);
  };

  const toggleDepositPopup = () => {
    setIsDepositPopupOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!gameDetail || !user) return;

    const userPublicKey = user.user.publicKey;
    const isGamePlayer = gameDetail.players.some(
      (key) => key === userPublicKey
    );

    if (!isGamePlayer) {
      router.replace('/game');
    }
  }, [gameDetail, user]);

  if (!gameDetail || !user)
    return (
      <p className='text-2xl text-center font-bold'>Loading game data...</p>
    );

  return (
    <>
      <div>
        <GameDetailCard gameDetails={gameDetail} />
        <div className='flex flex-col mt-3 gap-3'>
          <PrimaryButton
            className='flex-1'
            onClick={handleTransferToGame}
          >
            Transfer To Game
          </PrimaryButton>
          <PrimaryButton buttonType='outlined'>Win Game</PrimaryButton>
          <DangerButton
            className='flex-1'
            onClick={toggleQuitGamePopup}
          >
            Quit Game
          </DangerButton>
        </div>
      </div>
      <Divider />
      <SelfUserCard
        userData={user}
        openEndGameConfirmationPopup={toggleDeleteAccountPopup}
        toggleDepositPopup={toggleDepositPopup}
      />
      <EndGamePopup
        isPopupOpen={isDeleteAccountPopupOpen}
        togglePopupFn={toggleDeleteAccountPopup}
        username={username}
      />
      <DepositPopup
        closeFn={toggleDepositPopup}
        isOpen={isDepositPopupOpen}
        username={username}
      />
      <QuitGamePopup
        closePopupFn={toggleQuitGamePopup}
        gameName={decodedGameName}
        isPopupOpen={isQuitGamePopupOpen}
        username={username}
        poolPublicKey={pools?.map((pool) => pool.publicKey)[0] ?? ''}
      />
    </>
  );
};

export default GameDashboardPage;
