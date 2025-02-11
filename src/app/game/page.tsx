'use client';

import {
  useUsername,
  useUserPublicKey,
} from '@/components/custom-hooks/use-user';
import CreateGamePopup from '@/components/forms/create-game-popup/create-game-popup';
import GameList from '@/components/lists/game-list/game-list';
import { useGetAllGames } from '@/components/queries/game/get-game-queries';
import { useGetUser } from '@/components/queries/user/user-data-queries';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import Divider from '@/components/ui/divider';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const GamePage: NextPage = () => {
  const [isCreateGamePopupOpen, setIsCreateGamePopupOpen] =
    useState<boolean>(false);

  const username = useUsername();
  const userPublicKey = useUserPublicKey();

  const router = useRouter();

  const { data: userData, isPending: isPendingGetUserData } =
    useGetUser(username);

  const { data: gameData, isPending: isPendingGetAllGames } = useGetAllGames({
    username: userData?.user.name,
    poolPublicKey: userData?.pool.publicKey,
  });

  const toggleCreateGamePopup = () => {
    setIsCreateGamePopupOpen((prev) => !prev);
  };

  if (!userPublicKey || !username) {
    router.replace('/');
  }

  if (isPendingGetAllGames || isPendingGetUserData) {
    return <p className='text-xl font-bold text-center'>Loading Data...</p>;
  }

  return (
    <>
      <div className='w-full mb-3'>
        <PrimaryButton
          className='w-full'
          onClick={toggleCreateGamePopup}
        >
          Create Game
        </PrimaryButton>
      </div>
      <Divider />
      <GameList
        gameData={gameData ?? []}
        currentUserPublicKey={userPublicKey ?? ''}
      />
      <CreateGamePopup
        isPopupOpen={isCreateGamePopupOpen}
        closePopupFn={toggleCreateGamePopup}
      />
    </>
  );
};

export default GamePage;
