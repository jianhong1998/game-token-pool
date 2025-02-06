'use client';

import GameDashboard from '@/components/dashboard/game-dashboard';
import { useUserEndGame } from '@/components/queries/user/user-end-game-queries';
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

  const { isSuccess: isUserEndGameRequestSuccess } = useUserEndGame();

  const decodedUsername = decodeURI(username);

  useEffect(() => {
    if (isUserEndGameRequestSuccess) {
      router.replace('/game');
    }
  }, [isUserEndGameRequestSuccess, router]);

  return <GameDashboard username={decodedUsername} />;
};

export default UserPage;
