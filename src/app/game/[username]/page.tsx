'use client';

import GameDashboard from '@/components/dashboard/game-dashboard';
import { PageContext } from '@/types/page-context.type';
import { NextPage } from 'next';
import { useParams } from 'next/navigation';

type UserPageProps = {
  username: string;
};

const UserPage: NextPage<PageContext<UserPageProps>> = () => {
  const { username } = useParams<UserPageProps>();

  const decodedUsername = decodeURI(username);

  return <GameDashboard username={decodedUsername} />;
};

export default UserPage;
