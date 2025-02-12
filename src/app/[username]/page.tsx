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
  const { setValue: setUsernameInLocalStorage, value: usernameInLocalStorage } =
    useLocalStorage(LocalStorageKey.USER, '');

  const { isSuccess: isUserEndGameRequestSuccess } = useUserEndGame();

  const decodedUsername = decodeURI(username);

  if (usernameInLocalStorage !== decodedUsername) {
    setUsernameInLocalStorage(decodedUsername);
  }

  useEffect(() => {
    if (isUserEndGameRequestSuccess) {
      router.replace('/');
    }
  }, [isUserEndGameRequestSuccess, router]);

  return <UserDashboard username={decodedUsername} />;
};

export default UserPage;
