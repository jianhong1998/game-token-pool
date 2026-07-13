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
import { useEffect, useState, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

const GamePage: NextPage = () => {
  const [isCreateGamePopupOpen, setIsCreateGamePopupOpen] =
    useState<boolean>(false);
  // Server and the client's first (hydration) render must agree, so this
  // starts `false` on both and only flips to `true` on the client's next
  // render after hydration completes (getServerSnapshot vs. getSnapshot
  // diverge) — without ever calling setState from an effect.
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

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

  const isLoggedOut = !userPublicKey || !username;

  useEffect(() => {
    if (isLoggedOut) {
      router.replace('/');
    }
  }, [isLoggedOut, router]);

  if (hasMounted && isLoggedOut) return null;

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
