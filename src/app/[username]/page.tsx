'use client';

import UserDashboard from '@/components/dashboard/user-dashboard';
import { useUserEndGame } from '@/components/queries/user/user-end-game-queries';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { PageContext } from '@/types/page-context.type';
import { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

type UserPageProps = {
  username: string;
};

const UserPage: NextPage<PageContext<UserPageProps>> = () => {
  const { username } = useParams<UserPageProps>();
  const router = useRouter();

  const { isSuccess: isUserEndGameRequestSuccess } = useUserEndGame();

  const decodedUsername = decodeURI(username);

  if (localStorage.getItem(LocalStorageKey.USER) !== decodedUsername) {
    localStorage.setItem(LocalStorageKey.USER, decodedUsername);
  }

  useEffect(() => {
    if (isUserEndGameRequestSuccess) {
      router.replace('/');
    }
  }, [isUserEndGameRequestSuccess, router]);

  return <UserDashboard username={decodedUsername} />;
};

export default UserPage;
