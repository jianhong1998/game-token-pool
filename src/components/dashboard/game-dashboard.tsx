'use client';

import { FC, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGetUser } from '../queries/user/user-data-queries';
import { ErrorCode } from '@/constants/error';
import toast from 'react-hot-toast';
import UserCard from './user-card/user-card';
import { ErrorUtil } from '@/util/shared/error.util';

type GameDashboardProps = {
  username: string;
};

const GameDashboard: FC<GameDashboardProps> = ({ username }) => {
  const router = useRouter();

  const { data: userData, error: getUserError } = useGetUser(username);

  useEffect(() => {
    if (!getUserError) return;

    if (ErrorUtil.isUserNotFoundError(getUserError.message)) {
      toast.error('User is not found', {
        position: 'top-right',
      });
      router.replace('/game');
      return;
    }

    toast.error(ErrorCode.SOMETHING_WENT_WRONG, {
      position: 'top-right',
    });
    console.log(getUserError.message);
  }, [getUserError, router]);

  return (
    <>
      {!userData && (
        <div className='h-full'>
          <h1 className='text-center'>Loading user data...</h1>
        </div>
      )}
      {userData && <UserCard userData={userData} />}
    </>
  );
};

export default GameDashboard;
