'use client';

import { useLocalStorage } from '@/components/custom-hooks/use-local-storage';
import UserDashboard from '@/components/dashboard/user-dashboard';
import { useUserEndGame } from '@/components/queries/user/user-end-game-queries';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { PageContext } from '@/types/page-context.type';
import { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

type UserPageProps = {
  username: string;
};

const UserPage: NextPage<PageContext<UserPageProps>> = () => {
  const { username } = useParams<UserPageProps>();
  const router = useRouter();
  const {
    setValue: setUsernameInLocalStorage,
    value: usernameInLocalStorage,
    removeValue: removeUsernameInLocalStorage,
  } = useLocalStorage(LocalStorageKey.USER, '');
  const {
    value: userPublicKeyInLocalStorage,
    removeValue: removeUserPublicKeyInLocalStorage,
  } = useLocalStorage(LocalStorageKey.USER_PUBLIC_KEY, '');

  const { isSuccess: isUserEndGameRequestSuccess } = useUserEndGame();

  const decodedUsername = decodeURI(username);

  useEffect(() => {
    if (isUserEndGameRequestSuccess) {
      router.replace('/');
    }
  }, [isUserEndGameRequestSuccess, router]);

  useEffect(() => {
    if (
      !usernameInLocalStorage ||
      !userPublicKeyInLocalStorage ||
      usernameInLocalStorage.length === 0 ||
      userPublicKeyInLocalStorage.length === 0
    ) {
      removeUserPublicKeyInLocalStorage();
      removeUsernameInLocalStorage();
      router.replace('/');
    }
  }, [
    usernameInLocalStorage,
    userPublicKeyInLocalStorage,
    router,
    removeUserPublicKeyInLocalStorage,
    removeUsernameInLocalStorage,
  ]);

  return <UserDashboard username={decodedUsername} />;
};

export default UserPage;
