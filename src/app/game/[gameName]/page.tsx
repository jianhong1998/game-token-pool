'use client';

import { useUsername } from '@/components/custom-hooks/use-user';
import GameDetailCard from '@/components/dashboard/game-details-card/game-details-card';
import SelfUserCard from '@/components/dashboard/user-card/self-user-card';
import DepositPopup from '@/components/forms/deposit-popup/deposit-popup';
import EndGamePopup from '@/components/forms/end-game-popup/end-game-popup';
import QuitGamePopup from '@/components/forms/quit-game-popup/quit-game-popup';
import TakeTokenFromGamePopup from '@/components/forms/take-token-from-game-popup/take-token-from-game-popup';
import TransferToGamePopup from '@/components/forms/transfer-popup/transfer-to-game-popup';
import { useTakeTokenFromGame } from '@/components/queries/game/game-token-query';
import { useGetGameDetails } from '@/components/queries/game/get-game-queries';
import { useGetPools } from '@/components/queries/pool/use-pool';
import { useGetUser } from '@/components/queries/user/user-data-queries';
import { useTransferToGame } from '@/components/queries/user/user-transfer-queries';
import DangerButton from '@/components/ui/buttons/danger-button';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import Divider from '@/components/ui/divider';
import { PageContext } from '@/types/page-context.type';
import { NumberUtil } from '@/util/shared/number.util';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

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
  const [isTransferToGamePopupOpen, setIsTransferToGamePopupOpen] =
    useState<boolean>(false);
  const [isTakeTokenFromGamePopupOpen, setIsTakeTokenFromGamePopupOpen] =
    useState<boolean>(false);

  const username = useUsername();

  const router = useRouter();

  const { data: pools } = useGetPools();
  const poolPublicKey = useMemo(() => {
    return pools?.map((pool) => pool.publicKey)[0];
  }, [pools]);

  const { data: gameDetail } = useGetGameDetails({
    gameName: decodedGameName,
    poolPublicKey,
  });
  const { data: user } = useGetUser(username.length > 0 ? username : null);
  const { mutateAsync: transferFn, isPending: isTransferPending } =
    useTransferToGame(poolPublicKey ?? '');
  const {
    mutateAsync: takeTokenFromGameFn,
    isPending: isTakeTokenFromGamePending,
  } = useTakeTokenFromGame(poolPublicKey ?? '');

  const handleTransferToGame = async (cashAmount: number) => {
    await transferFn({ cashAmount, gameName: decodedGameName, username });
  };

  const handleTakeTokenFromGame = async (cashAmount: number) => {
    await takeTokenFromGameFn({
      cashAmount,
      gameName: decodedGameName,
      username,
    });
  };

  const toggleTakeTokenFromGamePopup = () => {
    setIsTakeTokenFromGamePopupOpen((prev) => !prev);
  };
  const toggleQuitGamePopup = () => {
    setIsQuitGamePopupOpen((prev) => !prev);
  };
  const toggleDeleteAccountPopup = () => {
    setIsDeleteAccountPopupOpen((prev) => !prev);
  };
  const toggleDepositPopup = () => {
    setIsDepositPopupOpen((prev) => !prev);
  };
  const toggleTransferToGamePopup = () => {
    setIsTransferToGamePopupOpen((prev) => !prev);
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
  }, [gameDetail, user, router]);

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
            onClick={toggleTransferToGamePopup}
          >
            Transfer To Game
          </PrimaryButton>
          <PrimaryButton
            buttonType='outlined'
            onClick={toggleTakeTokenFromGamePopup}
          >
            Take Token From Game
          </PrimaryButton>
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
      <TransferToGamePopup
        closePopupFn={toggleTransferToGamePopup}
        gameName={decodedGameName}
        isPopupOpen={isTransferToGamePopupOpen}
        isTransfering={isTransferPending}
        maxTransferAmount={user.token.currentAmount / 100}
        transferFn={handleTransferToGame}
      />
      <TakeTokenFromGamePopup
        closePopupFn={toggleTakeTokenFromGamePopup}
        isPopupOpen={isTakeTokenFromGamePopupOpen}
        gameName={decodedGameName}
        maxTransferAmount={
          NumberUtil.getDisplayAmount(gameDetail.totalToken).value
        }
        isActionProcessing={isTakeTokenFromGamePending}
        processFn={handleTakeTokenFromGame}
      />
    </>
  );
};

export default GameDashboardPage;
