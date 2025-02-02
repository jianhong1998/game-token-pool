'use client';

import { FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAllUsers, useGetUser } from '../queries/user/user-data-queries';
import { ErrorCode } from '@/constants/error';
import SelfUserCard from './user-card/self-user-card';
import { ErrorUtil } from '@/util/shared/error.util';
import { NotificationUtil } from '@/util/client/notification.util';
import OtherUserList from './user-card/other-user-list';

type GameDashboardProps = {
  username: string;
};

const GameDashboard: FC<GameDashboardProps> = ({ username }) => {
  const router = useRouter();

  const { data: userData, error: getUserError } = useGetUser(username);
  const { data: allUsersData, error: getAllUsersError } = useGetAllUsers();

  console.log({ allUsersData });

  // Handle get user error
  useEffect(() => {
    if (!getUserError) return;

    if (ErrorUtil.isUserNotFoundError(getUserError.message)) {
      NotificationUtil.error('User is not found');
      router.replace('/game');
      return;
    }

    NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
    console.log(getUserError.message);
  }, [getUserError, router]);

  // Handle get all users error
  useEffect(() => {
    if (!getAllUsersError) return;

    const errorMessage = getAllUsersError.message;

    NotificationUtil.error(errorMessage);
  }, [getAllUsersError]);

  if (!userData || !allUsersData) {
    return (
      <div className='h-100 flex flex-row items-center'>
        <h1 className='text-center flex-1 font-bold text-xl'>
          Loading user data...
        </h1>
      </div>
    );
  }

  return (
    <>
      <SelfUserCard userData={userData} />
      <OtherUserList users={allUsersData} />
    </>
  );
};

export default GameDashboard;
